import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { query, getClient } from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { extractPlanData } from '../services/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Helper function to extract text from PDF
 */
async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Helper function to extract text from Word document
 */
async function extractTextFromWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * Helper function to extract text from Excel
 */
function extractTextFromExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
    let text = '';
    const tables = [];

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      // build a plain-text representation
      sheetData.forEach(row => {
        text += row.join(' | ') + '\n';
      });

      // also produce CSV for clearer table context for the LLM
      try {
        const csv = xlsx.utils.sheet_to_csv(sheet);
        tables.push({ sheetName, csv });
      } catch (e) {
        // ignore csv conversion errors
      }
    });

    return { text, tables };
}

/**
 * Helper function to extract text based on file type
 */
async function extractTextFromFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
    if (mimeType.includes('pdf') || ext === '.pdf') {
      const t = await extractTextFromPDF(filePath);
      return { text: t, tables: [] };
    } else if (mimeType.includes('word') || ['.doc', '.docx'].includes(ext)) {
      const t = await extractTextFromWord(filePath);
      return { text: t, tables: [] };
    } else if (mimeType.includes('spreadsheet') || ['.xls', '.xlsx', '.csv'].includes(ext)) {
      return extractTextFromExcel(filePath);
    } else {
      throw new Error('Unsupported file type');
    }
  }

/**
 * POST /api/admin/upload-plans
 * Upload and process insurance plan documents (supports multiple files)
 */
router.post('/upload-plans', authenticateToken, requireAdmin, async (req, res) => {
  console.log('\n========================================');
  console.log('📤 UPLOAD REQUEST RECEIVED');
  console.log('========================================');
  console.log('Body:', req.body);
  console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
  
  try {
    if (!req.files || (!req.files.files && !req.files.file)) {
      console.log('❌ ERROR: No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { state_id } = req.body;

    if (!state_id) {
      console.log('❌ ERROR: State ID is required');
      return res.status(400).json({ error: 'State ID is required' });
    }
    
    // Optional provider name from user
    const manualProviderName = req.body.provider_name;

    // Verify state exists
    const stateCheck = await query('SELECT state_name FROM states WHERE id = $1', [state_id]);
    if (stateCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid state ID' });
    }

    // Handle both single and multiple file uploads
    let uploadedFiles = [];
    if (req.files.files) {
      uploadedFiles = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    } else if (req.files.file) {
      uploadedFiles = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
    }

    console.log(`\n📁 Processing ${uploadedFiles.length} file(s)...`);
    uploadedFiles.forEach((f, idx) => {
      console.log(`  [${idx + 1}] ${f.name} (${(f.size / 1024).toFixed(2)} KB, ${f.mimetype})`);
    });

    const results = {
      total_files: uploadedFiles.length,
      successful: 0,
      failed: 0,
      total_plans_added: 0,
      details: []
    };

    // STEP 1: Extract text from ALL files first
    console.log('\n🔍 Step 1: Extracting text from all files...');
    let combinedContent = '';
    let allTables = [];
    const savedFiles = [];
    let failedExtractions = 0;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadedFile = uploadedFiles[i];
      const fileName = `${Date.now()}_${i}_${uploadedFile.name}`;
      const filePath = path.join(uploadsDir, fileName);

      try {
        // Save file
        await uploadedFile.mv(filePath);
        savedFiles.push({ filePath, fileName, originalName: uploadedFile.name });

        console.log(`\n[${i + 1}/${uploadedFiles.length}] � Extracting: ${uploadedFile.name}`);

        // Extract text from file
        const extractionResult = await extractTextFromFile(filePath, uploadedFile.mimetype);
        const documentContent = extractionResult.text;
        const tables = extractionResult.tables || [];

        console.log(`  ✅ Extracted ${documentContent.length} characters`);
        if (tables.length > 0) {
          console.log(`  📊 Found ${tables.length} table(s)`);
        }

        // Combine content with file separator
        combinedContent += `\n\n=== FILE: ${uploadedFile.name} ===\n\n${documentContent}`;
        
        // Combine tables
        if (tables.length > 0) {
          allTables.push(...tables.map(t => ({
            ...t,
            sourceFile: uploadedFile.name
          })));
        }

        results.successful++;
      } catch (error) {
        console.error(`❌ Failed to extract from ${uploadedFile.name}:`, error.message);
        failedExtractions++;
        results.failed++;
        results.details.push({
          file: uploadedFile.name,
          status: 'failed',
          error: `Text extraction failed: ${error.message}`
        });
        
        // Clean up file if it exists
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // If all files failed to extract, return error
    if (failedExtractions === uploadedFiles.length) {
      return res.status(400).json({
        error: 'Failed to extract text from all files',
        results: results
      });
    }

    // STEP 2: Process combined content with Gemini ONCE
    console.log('\n🤖 Step 2: Processing combined content with Gemini...');
    console.log(`  Total content length: ${combinedContent.length} characters`);
    console.log(`  Total tables: ${allTables.length}`);

    try {
      // Use Gemini to extract plan data from combined content
      const extractedData = await extractPlanData(combinedContent, { 
        filename: `Combined_${uploadedFiles.length}_files`,
        tables: allTables
      });

      console.log('✅ Data extracted from Gemini successfully!');
      console.log('Provider:', extractedData.provider_name);
      console.log('Plans found:', extractedData.plans.length);
      console.log('✅ Data extracted from Gemini successfully!');
      console.log('Provider:', extractedData.provider_name);
      console.log('Plans found:', extractedData.plans.length);
        
      // Use manual provider name if provided and Gemini didn't find one
      if (manualProviderName && (!extractedData.provider_name || extractedData.provider_name === 'Unknown Provider')) {
        console.log('📝 Using manual provider name:', manualProviderName);
        extractedData.provider_name = manualProviderName;
      }

      // STEP 3: Save to database
      console.log('\n💾 Step 3: Saving to database...');
      const client = await getClient();
      
      try {
        await client.query('BEGIN');

        // Get or create provider
        let providerId;
        const providerCheck = await client.query(
          'SELECT id FROM providers WHERE name = $1',
          [extractedData.provider_name]
        );

        if (providerCheck.rows.length > 0) {
          providerId = providerCheck.rows[0].id;
          console.log('  Found existing provider ID:', providerId);
        } else {
          const providerResult = await client.query(
            'INSERT INTO providers (name) VALUES ($1) RETURNING id',
            [extractedData.provider_name]
          );
          providerId = providerResult.rows[0].id;
          console.log('  Created new provider ID:', providerId);
        }

        // Create document source reference
        const documentSource = savedFiles.map(f => f.originalName).join(', ');

        // Insert or update plans
        // Strategy: 
        // 1. First, delete all existing plans for this provider+state (clean slate)
        // 2. Then insert all extracted plans from the new documents
        // This ensures we always have fresh data matching the uploaded files
        
        console.log(`  Removing any existing plans for this provider in ${stateCheck.rows[0].state_name}...`);
        const deleteResult = await client.query(
          'DELETE FROM plans WHERE provider_id = $1 AND state_id = $2',
          [providerId, state_id]
        );
        console.log(`  Deleted ${deleteResult.rowCount} existing plan(s)`);

        // Now insert all extracted plans
        const insertedPlans = [];
        for (const plan of extractedData.plans) {
          console.log(`  ➕ Creating plan: ${plan.plan_name}`);
          const result = await client.query(
            `INSERT INTO plans (
              provider_id, state_id, plan_name, plan_type,
              monthly_cost, annual_cost, deductible, max_coverage,
              coverage_type, features, eligibility_criteria, exclusions,
              document_source, benefits_table, age_based_pricing, structured_features, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
            RETURNING id, plan_name, plan_type, monthly_cost`,
            [
              providerId, state_id, plan.plan_name, plan.plan_type,
              plan.monthly_cost, plan.annual_cost, plan.deductible,
              plan.max_coverage, plan.coverage_type, plan.features,
              plan.eligibility_criteria, plan.exclusions, documentSource,
              plan.benefits_table || null,
              plan.age_based_pricing ? JSON.stringify(plan.age_based_pricing) : null,
              plan.structured_features ? JSON.stringify(plan.structured_features) : '{}'
            ]
          );
          insertedPlans.push({ ...result.rows[0], updated: deleteResult.rowCount > 0 });
        }

        await client.query('COMMIT');
        client.release();

        results.total_plans_added = insertedPlans.length;
        results.details.push({
          files: savedFiles.map(f => f.originalName),
          status: 'success',
          provider: extractedData.provider_name,
          plans_processed: insertedPlans.length,
          plans: insertedPlans
        });

        console.log(`\n✅ Successfully processed all files!`);
        console.log(`   Provider: ${extractedData.provider_name}`);
        console.log(`   Plans created/updated: ${insertedPlans.length}`);

      } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        throw error;
      }

      // Clean up all saved files after successful processing
      for (const savedFile of savedFiles) {
        if (fs.existsSync(savedFile.filePath)) {
          fs.unlinkSync(savedFile.filePath);
        }
      }

    } catch (error) {
      console.error(`\n❌ Error processing with Gemini:`);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Clean up all files on error
      for (const savedFile of savedFiles) {
        if (fs.existsSync(savedFile.filePath)) {
          fs.unlinkSync(savedFile.filePath);
        }
      }

      return res.status(500).json({
        error: 'Failed to process files with AI',
        details: error.message,
        results: results
      });
    }

    const allPlans = results.details.flatMap(d => d.plans);
    const hadExistingPlans = allPlans.some(p => p.updated);
    const totalPlans = allPlans.length;
    
    let message = `Processed ${results.total_files} file(s): ${results.successful} successful, ${results.failed} failed. `;
    if (hadExistingPlans) {
      message += `Replaced existing plans with ${totalPlans} new plan(s) from uploaded documents.`;
    } else {
      message += `Created ${totalPlans} new plan(s).`;
    }

    res.json({
      message: message.trim(),
      state: stateCheck.rows[0].state_name,
      total_plans: totalPlans,
      results: results
    });

  } catch (error) {
    console.error('Error in upload-plans:', error);
    res.status(500).json({
      error: 'Failed to upload and process files',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/plans
 * Get all plans with admin view (including inactive)
 */
router.get('/plans', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { state_id, is_active, limit = 100, offset = 0 } = req.query;

    let queryText = `
      SELECT p.*, pr.name as provider_name, s.state_name
      FROM plans p
      JOIN providers pr ON p.provider_id = pr.id
      LEFT JOIN states s ON p.state_id = s.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 1;

    if (state_id) {
      queryText += ` AND p.state_id = $${paramCount}`;
      queryParams.push(state_id);
      paramCount++;
    }

    if (is_active !== undefined) {
      queryText += ` AND p.is_active = $${paramCount}`;
      queryParams.push(is_active === 'true');
      paramCount++;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, queryParams);

    res.json({
      plans: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching admin plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * PUT /api/admin/plans/:id
 * Update a plan
 */
router.put('/plans/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plan_name,
      monthly_cost,
      annual_cost,
      deductible,
      max_coverage,
      features,
      is_active
    } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (plan_name !== undefined) {
      updates.push(`plan_name = $${paramCount}`);
      values.push(plan_name);
      paramCount++;
    }

    if (monthly_cost !== undefined) {
      updates.push(`monthly_cost = $${paramCount}`);
      values.push(monthly_cost);
      paramCount++;
    }

    if (annual_cost !== undefined) {
      updates.push(`annual_cost = $${paramCount}`);
      values.push(annual_cost);
      paramCount++;
    }

    if (deductible !== undefined) {
      updates.push(`deductible = $${paramCount}`);
      values.push(deductible);
      paramCount++;
    }

    if (max_coverage !== undefined) {
      updates.push(`max_coverage = $${paramCount}`);
      values.push(max_coverage);
      paramCount++;
    }

    if (features !== undefined) {
      updates.push(`features = $${paramCount}`);
      values.push(features);
      paramCount++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await query(
      `UPDATE plans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({
      message: 'Plan updated successfully',
      plan: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

/**
 * DELETE /api/admin/plans/:id
 * Delete a plan (soft delete by setting is_active to false)
 */
router.delete('/plans/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Permanent deletion
      await query('DELETE FROM plans WHERE id = $1', [id]);
    } else {
      // Soft delete
      await query('UPDATE plans SET is_active = false WHERE id = $1', [id]);
    }

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM plans WHERE is_active = true) as active_plans,
        (SELECT COUNT(*) FROM providers) as total_providers,
        (SELECT COUNT(DISTINCT state_id) FROM plans) as states_with_plans,
        (SELECT COUNT(*) FROM chat_history) as total_chats
    `);

    const plansByType = await query(`
      SELECT plan_type, COUNT(*) as count
      FROM plans
      WHERE is_active = true
      GROUP BY plan_type
      ORDER BY count DESC
    `);

    const plansByState = await query(`
      SELECT s.state_name, COUNT(p.id) as count
      FROM states s
      LEFT JOIN plans p ON s.id = p.state_id AND p.is_active = true
      GROUP BY s.state_name
      ORDER BY count DESC
    `);

    res.json({
      overview: stats.rows[0],
      plans_by_type: plansByType.rows,
      plans_by_state: plansByState.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

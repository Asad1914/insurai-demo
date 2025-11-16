#!/usr/bin/env node
/**
 * Standalone Gemini Document Extraction Tester
 * 
 * This tool allows you to test Gemini's ability to read and understand
 * insurance documents (PDF, Excel, Word) without running the full application.
 * 
 * Usage:
 *   node test_gemini_extraction.js <file1> [file2] [file3] ...
 * 
 * Example:
 *   node test_gemini_extraction.js "insurance_plan.pdf" "pricing.xlsx"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalCwd = process.cwd();
const backendDir = path.join(__dirname, 'backend');

// Change to backend directory to use its modules
process.chdir(backendDir);

// Now import backend modules with absolute paths
const { extractPlanData } = await import(path.join(backendDir, 'services/gemini.js'));
const pdfParse = (await import('pdf-parse')).default;
const mammoth = (await import('mammoth')).default;
const xlsx = (await import('xlsx')).default;
const { GoogleGenerativeAI } = await import('@google/generative-ai');
const dotenv = (await import('dotenv')).default;

// Change back to original directory for file path resolution
process.chdir(originalCwd);

dotenv.config({ path: path.join(backendDir, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

async function extractPDF(filePath) {
  console.log('   📄 Extracting PDF...');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return {
    text: data.text,
    pages: data.numpages,
    tables: []
  };
}

async function extractWord(filePath) {
  console.log('   📝 Extracting Word document...');
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    text: result.value,
    tables: []
  };
}

function extractExcel(filePath) {
  console.log('   📊 Extracting Excel spreadsheet...');
  const workbook = xlsx.readFile(filePath);
  let text = '';
  const tables = [];
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    sheetData.forEach(row => {
      text += row.join(' | ') + '\n';
    });
    
    try {
      const csv = xlsx.utils.sheet_to_csv(sheet);
      tables.push({ 
        sheetName, 
        csv,
        rowCount: sheetData.length,
        colCount: sheetData[0]?.length || 0
      });
    } catch (e) {
      console.error(`     ⚠️  Could not convert sheet "${sheetName}" to CSV`);
    }
  });
  
  return { text, tables };
}

async function extractContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📂 Processing: ${fileName}`);
  console.log(`${'='.repeat(80)}`);
  
  let extraction;
  
  try {
    if (ext === '.pdf') {
      extraction = await extractPDF(filePath);
    } else if (['.doc', '.docx'].includes(ext)) {
      extraction = await extractWord(filePath);
    } else if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      extraction = extractExcel(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
    
    console.log(`   ✅ Extraction complete`);
    console.log(`   📝 Text length: ${extraction.text.length} characters`);
    if (extraction.pages) {
      console.log(`   📄 Pages: ${extraction.pages}`);
    }
    if (extraction.tables && extraction.tables.length > 0) {
      console.log(`   📊 Tables found: ${extraction.tables.length}`);
      extraction.tables.forEach((t, i) => {
        console.log(`      - Sheet "${t.sheetName}": ${t.rowCount} rows × ${t.colCount} cols`);
      });
    }
    
    return { fileName, ...extraction };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// GEMINI ANALYSIS
// ============================================================================

const EXTRACTION_PROMPT = `You are an expert insurance document analyzer. Analyze the provided document and extract ALL relevant information in a clear, organized format.

For the document provided, extract and describe:

1. **Document Type**: What kind of document is this?

2. **Provider/Company**: Who is the insurance provider?

3. **Plan Details**: Plan name(s), coverage type, coverage level

4. **Pricing Information**:
   - Monthly/Annual costs
   - Deductibles
   - Maximum coverage limits
   - Age-based pricing (list ALL age bands with premiums if present)

5. **Benefits Table** (if present):
   - List ALL benefits/coverage items with amounts and limits
   - Include copays, waiting periods, conditions

6. **Key Features**: Network info, geographic coverage, requirements

7. **Exclusions**: What is NOT covered

8. **Additional Notes**: Important conditions or special provisions

Be thorough and extract ALL numerical data, especially from tables. If you see a pricing table with multiple rows, extract EVERY row with complete details.`;

async function analyzeWithGemini(extraction) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log('🤖 Analyzing with Gemini AI (Detailed Analysis)...');
  console.log(`${'─'.repeat(80)}\n`);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  let prompt = EXTRACTION_PROMPT + '\n\n';
  prompt += `Document: ${extraction.fileName}\n\n`;
  
  if (extraction.tables && extraction.tables.length > 0) {
    prompt += '=== TABLES (CSV Format) ===\n\n';
    extraction.tables.forEach(t => {
      prompt += `Sheet: ${t.sheetName}\n`;
      prompt += `${t.csv}\n\n`;
    });
  }
  
  prompt += '=== DOCUMENT TEXT CONTENT ===\n\n';
  prompt += extraction.text.substring(0, 15000);
  if (extraction.text.length > 15000) {
    prompt += '\n\n[... content truncated ...]';
  }
  
  try {
    console.log('   Sending to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('   ✅ Analysis complete\n');
    return text;
    
  } catch (error) {
    console.error('   ❌ Gemini API Error:', error.message);
    throw error;
  }
}

async function analyzeWithStructuredExtraction(extraction) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log('🤖 Analyzing with Gemini AI (Structured Extraction - InsurAI Format)...');
  console.log(`${'─'.repeat(80)}\n`);
  
  try {
    console.log('   Sending to Gemini API...');
    const result = await extractPlanData(extraction.text, {
      filename: extraction.fileName,
      tables: extraction.tables
    });
    
    console.log('   ✅ Structured extraction complete\n');
    return result;
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                              ║');
  console.log('║              🧪 Gemini Document Extraction Tester 🧪                        ║');
  console.log('║                                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    console.error('❌ No files provided!\n');
    console.log('Usage:');
    console.log('  node test_gemini_extraction.js <file1> [file2] [file3] ...\n');
    console.log('Example:');
    console.log('  node test_gemini_extraction.js "benefits.pdf" "pricing.xlsx"\n');
    process.exit(1);
  }
  
  // Make paths absolute
  const absoluteFiles = files.map(f => path.isAbsolute(f) ? f : path.join(__dirname, f));
  
  // Validate files
  for (const file of absoluteFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ File not found: ${file}\n`);
      process.exit(1);
    }
  }
  
  console.log(`📁 Files to process: ${absoluteFiles.length}\n`);
  
  const results = [];
  
  for (const file of absoluteFiles) {
    try {
      // Extract content
      const extraction = await extractContent(file);
      
      // Show preview
      console.log(`\n   📋 Text Preview (first 300 chars):`);
      console.log(`   ${'-'.repeat(76)}`);
      const preview = extraction.text.substring(0, 300).replace(/\n/g, '\n   ');
      console.log(`   ${preview}${extraction.text.length > 300 ? '...' : ''}`);
      console.log(`   ${'-'.repeat(76)}`);
      
      // Run BOTH analyses
      const detailedAnalysis = await analyzeWithGemini(extraction);
      const structuredData = await analyzeWithStructuredExtraction(extraction);
      
      results.push({
        file: path.basename(file),
        success: true,
        extraction,
        detailedAnalysis,
        structuredData
      });
      
      // Display results
      console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                      📊 DETAILED ANALYSIS (Human-Readable)                   ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
      console.log(detailedAnalysis);
      
      console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                   💾 STRUCTURED DATA (InsurAI Database Format)               ║');
      console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
      console.log(JSON.stringify(structuredData, null, 2));
      console.log('\n');
      
    } catch (error) {
      console.error(`\n❌ Failed to process ${path.basename(file)}: ${error.message}\n`);
      results.push({
        file: path.basename(file),
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              📈 SUMMARY                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   Total files processed: ${results.length}`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('   Failed files:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`      - ${r.file}: ${r.error}`);
    });
    console.log('');
  }
  
  console.log('✨ Testing complete!\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

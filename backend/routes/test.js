import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractPlanData } from '../services/gemini.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Extract content functions
async function extractPDF(buffer) {
  const data = await pdfParse(buffer);
  return { text: data.text, pages: data.numpages, tables: [] };
}

async function extractWord(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, tables: [] };
}

function extractExcel(buffer) {
  const workbook = xlsx.read(buffer);
  let text = '';
  const tables = [];
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    sheetData.forEach(row => { text += row.join(' | ') + '\n'; });
    
    try {
      const csv = xlsx.utils.sheet_to_csv(sheet);
      tables.push({ sheetName, csv, rowCount: sheetData.length });
    } catch (e) {}
  });
  
  return { text, tables };
}

async function extractContent(buffer, mimeType, filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (ext === '.pdf' || mimeType.includes('pdf')) {
    return await extractPDF(buffer);
  } else if (['.doc', '.docx'].includes(ext) || mimeType.includes('word')) {
    return await extractWord(buffer);
  } else if (['.xls', '.xlsx'].includes(ext) || mimeType.includes('spreadsheet')) {
    return extractExcel(buffer);
  }
  
  throw new Error('Unsupported file type');
}

async function detailedAnalysis(extraction, filename) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  let prompt = `Analyze this insurance document and extract ALL information including:
- Provider/Company name
- Plan name(s) and types
- Pricing (monthly/annual costs, age-based pricing if present - list ALL age bands)
- Benefits table (list ALL benefits with coverage amounts)
- Deductibles, max coverage
- Key features, network info
- Exclusions

Be thorough and extract EVERY row from tables.

Document: ${filename}

`;
  
  if (extraction.tables && extraction.tables.length > 0) {
    prompt += 'TABLES:\n';
    extraction.tables.forEach(t => {
      prompt += `\n${t.sheetName}:\n${t.csv}\n`;
    });
  }
  
  prompt += `\nDOCUMENT TEXT:\n${extraction.text.substring(0, 15000)}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * POST /api/test/extract
 * Test endpoint for document extraction
 */
router.post('/extract', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    console.log('Test extraction request:', file.name, file.mimetype);

    // Extract content
    const extraction = await extractContent(file.data, file.mimetype, file.name);
    
    // Run both analyses
    const [detailedResult, structuredResult] = await Promise.all([
      detailedAnalysis(extraction, file.name),
      extractPlanData(extraction.text, {
        filename: file.name,
        tables: extraction.tables
      })
    ]);

    res.json({
      success: true,
      extraction: {
        textLength: extraction.text.length,
        pages: extraction.pages,
        tablesCount: extraction.tables?.length || 0
      },
      detailedAnalysis: detailedResult,
      structuredData: structuredResult
    });

  } catch (error) {
    console.error('Test extraction error:', error);
    res.status(500).json({
      error: 'Failed to analyze document',
      details: error.message
    });
  }
});

export default router;

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { extractPlanData } from '../services/gemini.js';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function extractTextFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return { text: data.text, tables: [] };
}

async function extractTextFromWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return { text: result.value, tables: [] };
}

function extractTextFromExcel(filePath) {
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
      tables.push({ sheetName, csv });
    } catch (e) {}
  });
  return { text, tables };
}

async function run(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let extraction;
  if (ext === '.pdf') extraction = await extractTextFromPDF(filePath);
  else if (ext === '.doc' || ext === '.docx') extraction = await extractTextFromWord(filePath);
  else if (ext === '.xls' || ext === '.xlsx' || ext === '.csv') extraction = extractTextFromExcel(filePath);
  else if (ext === '.txt') {
    const text = fs.readFileSync(filePath, 'utf8');
    extraction = { text, tables: [] };
  }
  else {
    console.error('unsupported file:', filePath);
    return;
  }

  console.log('Document length:', extraction.text.length);
  if (extraction.tables && extraction.tables.length) console.log('Tables:', extraction.tables.map(t=>t.sheetName));

  try {
    const res = await extractPlanData(extraction.text, { filename: path.basename(filePath), tables: extraction.tables });
    console.log('EXTRACTION RESULT:\n', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Extraction error:', e.message);
  }
}

// Read file paths from command line args
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node run_extract_test.js <file1> [file2 ...]');
  process.exit(1);
}

(async () => {
  for (const f of args) {
    console.log('--- Testing file:', f);
    await run(f);
  }
})();

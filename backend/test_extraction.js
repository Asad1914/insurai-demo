#!/usr/bin/env node
/**
 * Gemini Document Extraction Tester
 * 
 * Place your files to test in the backend/uploads folder and run:
 *   cd backend && node test_extraction.js <filename>
 * 
 * Example:
 *   cd backend && node test_extraction.js "uploads/insurance.pdf"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractPlanData } from './services/gemini.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============================================================================
// Extract content
// ============================================================================

async function extractPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return { text: data.text, pages: data.numpages, tables: [] };
}

async function extractWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return { text: result.value, tables: [] };
}

function extractExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
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

async function extractContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return await extractPDF(filePath);
  if (['.doc', '.docx'].includes(ext)) return await extractWord(filePath);
  if (['.xls', '.xlsx'].includes(ext)) return extractExcel(filePath);
  throw new Error('Unsupported file type: ' + ext);
}

// ============================================================================
// Analyze
// ============================================================================

async function detailedAnalysis(extraction) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  let prompt = `Analyze this insurance document and extract ALL information including:
- Provider/Company name
- Plan name(s) and types
- Pricing (monthly/annual costs, age-based pricing if present - list ALL age bands)
- Benefits table (list ALL benefits with coverage amounts)
- Deductibles, max coverage
- Key features, network info
- Exclusions

Be thorough and extract EVERY row from tables.\n\n`;
  
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

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('           🧪 Gemini Document Extraction Tester 🧪');
  console.log('='.repeat(80) + '\n');
  
  const files = process.argv.slice(2);
  
  if (files.length === 0) {
    console.log('Usage: node test_extraction.js <file1> [file2] ...\n');
    console.log('Example: node test_extraction.js uploads/benefits.pdf\n');
    process.exit(1);
  }
  
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`❌ File not found: ${file}\n`);
      continue;
    }
    
    console.log(`\n📂 File: ${path.basename(file)}`);
    console.log('-'.repeat(80));
    
    try {
      // Extract
      console.log('Extracting content...');
      const extraction = await extractContent(file);
      console.log(`✅ Extracted ${extraction.text.length} chars`);
      if (extraction.pages) console.log(`   Pages: ${extraction.pages}`);
      if (extraction.tables?.length) {
        console.log(`   Tables: ${extraction.tables.length}`);
        extraction.tables.forEach(t => console.log(`     - ${t.sheetName} (${t.rowCount} rows)`));
      }
      
      // Preview
      console.log(`\n📋 Preview:\n${extraction.text.substring(0, 300)}...\n`);
      
      // Detailed analysis
      console.log('🤖 Running detailed Gemini analysis...');
      const analysis = await detailedAnalysis(extraction);
      console.log('\n' + '='.repeat(80));
      console.log('📊 DETAILED ANALYSIS:');
      console.log('='.repeat(80));
      console.log(analysis);
      
      // Structured extraction
      console.log('\n' + '='.repeat(80));
      console.log('💾 STRUCTURED DATA (InsurAI Format):');
      console.log('='.repeat(80));
      const structured = await extractPlanData(extraction.text, {
        filename: path.basename(file),
        tables: extraction.tables
      });
      console.log(JSON.stringify(structured, null, 2));
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('✨ Testing complete!\n');
}

main().catch(console.error);

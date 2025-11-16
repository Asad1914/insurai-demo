import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    console.log('📝 Creating database schema...');
    await pool.query(schema);
    
    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('Default admin credentials:');
    console.log('Email: admin@insurai.com');
    console.log('Password: Admin@123');
    console.log('');
    console.log('UAE States configured:');
    console.log('- Abu Dhabi (AD)');
    console.log('- Dubai (DU)');
    console.log('- Sharjah (SH)');
    console.log('- Ajman (AJ)');
    console.log('- Umm Al Quwain (UAQ)');
    console.log('- Ras Al Khaimah (RAK)');
    console.log('- Fujairah (FU)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();

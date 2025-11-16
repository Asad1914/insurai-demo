import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MOCK_GEMINI = process.env.MOCK_GEMINI === 'true';

function _mockParseCsvTablesToFeatures(tables) {
  // Convert CSV tables into a human-readable age-band pricing string
  try {
    const rows = tables[0].csv.split('\n').filter(Boolean).map(r => r.split(','));
    const header = rows[0] || [];
    const lines = rows.slice(1).map(r => `${r[0].trim()}: ${r[1] ? r[1].trim() : ''}`);
    return [`Age-based pricing: ${lines.join(' | ')}`];
  } catch (e) {
    return ['Age-based pricing available in attached table'];
  }
}

// System prompt for insurance advisor chatbot
const INSURANCE_ADVISOR_PROMPT = `You are an expert Insurance Advisor AI assistant for InsurAI, a platform that helps users in the United Arab Emirates (UAE) find the best insurance plans.

Your role is to:
1. Answer questions about insurance concepts (deductibles, premiums, coverage, exclusions, etc.)
2. Explain different types of insurance (Health, Auto, Life, Property, Travel)
3. Help users understand insurance terms and conditions
4. Provide guidance on choosing the right insurance plan
5. Explain UAE-specific insurance regulations and requirements
6. Be friendly, professional, and helpful

Important guidelines:
- Always provide accurate and helpful information
- If you're unsure about something, admit it and suggest consulting with an insurance professional
- Use simple language to explain complex insurance concepts
- Be specific about UAE insurance context when relevant
- Do not make up information about specific plans or providers
- Encourage users to compare multiple plans before making decisions
- Be concise but thorough in your responses

Context about UAE states:
- Abu Dhabi, Dubai, Sharjah, Ajman, Umm Al Quwain, Ras Al Khaimah, Fujairah
- Each emirate may have different insurance requirements and regulations`;

// System prompt for extracting insurance plan data from documents
const PLAN_EXTRACTION_PROMPT = `You are an expert insurance document analyzer. Your task is to extract structured insurance plan information from the provided document.

Extract the following information:
1. Provider/Company name (look for company logos, headers, footers, or mentions in the document. If not found, set to null)
2. Plan name (if not explicitly stated, create a descriptive name based on coverage type and features)
3. Plan type (Health, Auto, Life, Property, Travel) - default to Health if unclear
4. Monthly cost (if available)
5. Annual cost (if available)
6. Deductible amount
7. Maximum coverage amount (look for "aggregate limit", "annual limit", "max coverage")
8. Coverage type (Individual, Family, etc.)
9. Key features (as an array of strings) - include hospitals, benefits, perks, network coverage
10. Eligibility criteria
11. Exclusions
12. Benefits table (if present in the document)
13. Age-based pricing (if present in tables or CSV data)

STRUCTURED FEATURE EXTRACTION (CRITICAL):
Extract these specific features for comparison purposes:
- network_hospitals_count: Number of hospitals in network (integer or null)
- network_type: Type of network (e.g., "Network", "PPO", "HMO", "Direct Billing", "Reimbursement") or null
- uae_coverage: Does the plan cover all UAE states/emirates? (true/false/null)
- gcc_coverage: Does the plan cover GCC countries? (true/false/null) 
- international_coverage: Does the plan have international coverage? (true/false/null)
- outpatient_coverage: Is outpatient covered? (true/false/null)
- inpatient_coverage: Is inpatient covered? (true/false/null)
- dental_coverage: Is dental covered? (true/false/null)
- optical_coverage: Is optical/vision covered? (true/false/null)
- maternity_coverage: Is maternity covered? (true/false/null)
- pre_existing_conditions: Are pre-existing conditions covered? (true/false/null)
- pharmacy_coverage: Is pharmacy/medication covered? (true/false/null)
- emergency_coverage: Is emergency services covered? (true/false/null)
- ambulance_service: Is ambulance service included? (true/false/null)
- preventive_care: Is preventive/wellness care included? (true/false/null)
- chronic_conditions_covered: Are chronic conditions covered? (true/false/null)
- mental_health_coverage: Is mental health covered? (true/false/null)
- physiotherapy_coverage: Is physiotherapy covered? (true/false/null)
- alternative_medicine: Is alternative medicine covered? (true/false/null)
- waiting_period_days: Waiting period in days (integer or null)
- copay_percentage: Co-payment percentage (integer 0-100 or null)
- room_type: Type of room covered (e.g., "Private", "Semi-Private", "Shared", "Ward") or null
- cashless_claims: Does the plan support cashless claims? (true/false/null)

CRITICAL INSTRUCTIONS FOR TABLES:
- If you see a benefits table, extract ALL rows and present them clearly in the features array
- For age-based pricing tables, extract EVERY age band with its corresponding premium
- Format pricing as: "Age [range]: [premium] AED" for each age band
- Include table headers and all data rows
- If tables are in CSV format (provided separately), parse them completely
- Look for hospital network lists and count them

CRITICAL: Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO explanations.

Return the data in EXACTLY this JSON format:
{
  "provider_name": "string or null",
  "plans": [
    {
      "plan_name": "string",
      "plan_type": "Health",
      "monthly_cost": number or null,
      "annual_cost": number or null,
      "deductible": number or null,
      "max_coverage": number or null,
      "coverage_type": "string or null",
      "features": ["feature1", "feature2", "feature3"],
      "eligibility_criteria": "string or null",
      "exclusions": "string or null",
      "benefits_table": "string or null",
      "age_based_pricing": [
        {"age_range": "0-17", "premium": 320},
        {"age_range": "18-45", "premium": 320}
      ],
      "structured_features": {
        "network_hospitals_count": number or null,
        "network_type": "string or null",
        "uae_coverage": boolean or null,
        "gcc_coverage": boolean or null,
        "international_coverage": boolean or null,
        "outpatient_coverage": boolean or null,
        "inpatient_coverage": boolean or null,
        "dental_coverage": boolean or null,
        "optical_coverage": boolean or null,
        "maternity_coverage": boolean or null,
        "pre_existing_conditions": boolean or null,
        "pharmacy_coverage": boolean or null,
        "emergency_coverage": boolean or null,
        "ambulance_service": boolean or null,
        "preventive_care": boolean or null,
        "chronic_conditions_covered": boolean or null,
        "mental_health_coverage": boolean or null,
        "physiotherapy_coverage": boolean or null,
        "alternative_medicine": boolean or null,
        "waiting_period_days": number or null,
        "copay_percentage": number or null,
        "room_type": "string or null",
        "cashless_claims": boolean or null
      }
    }
  ]
}

Important:
- If information is not available, use null
- Extract all monetary values as numbers (without currency symbols, commas, or text like "AED")
- For premium tables with multiple age bands, include BOTH the base premium in annual_cost AND the complete age_based_pricing array
- Extract EVERY benefit from tables - coverage items, limits, deductibles, copays, waiting periods
- For structured_features, use true/false for boolean fields, numbers for counts/percentages, and strings for descriptive fields
- Look carefully in the document for mentions of coverage areas, hospital networks, and specific benefits
- For benefits tables, create detailed feature entries like "Benefit: [name] - Coverage: [amount] - Copay: [amount]"
- If CSV tables are provided, parse them row by row and include all information
- Be thorough and extract all distinct plans found in the document
- For features, extract key benefits, coverage details, hospital networks, and special notes
- Ensure the JSON is valid and properly formatted
- If multiple distinct plans are in the document, include all of them in the plans array
- Return ONLY the JSON object, nothing else
`;

/**
 * Chat with the insurance advisor AI
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous conversation history
 * @returns {Promise<string>} - AI response
 */
export async function chatWithAdvisor(userMessage, conversationHistory = []) {
  try {
    if (MOCK_GEMINI) {
      // Simple mock reply for testing without an API key
      return `Mock reply to: ${userMessage}`;
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build conversation context
    let contextMessages = [INSURANCE_ADVISOR_PROMPT];
    
    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      contextMessages.push(`User: ${msg.message}`);
      contextMessages.push(`Assistant: ${msg.response}`);
    });
    
    // Add current user message
    contextMessages.push(`User: ${userMessage}`);
    contextMessages.push('Assistant:');

    const prompt = contextMessages.join('\n\n');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();
  } catch (error) {
    console.error('Gemini API Error (Chat):', error);
    throw new Error('Failed to get response from AI advisor');
  }
}

/**
 * Extract insurance plan data from document content
 * @param {string} documentContent - The text content of the document
 * @returns {Promise<Object>} - Extracted plan data
 */
export async function extractPlanData(documentContent, options = {}) {
  try {
    if (MOCK_GEMINI) {
      // Create a deterministic mock response for testing when GEMINI API key is not set/valid
      const provider = (options && options.filename) ? options.filename.split(/[._-]/)[0] : 'Mock Provider';
      const plans = [];
      const planName = `Mock Plan from ${provider}`;
      const features = [];
      if (options.tables && options.tables.length) {
        features.push(..._mockParseCsvTablesToFeatures(options.tables));
      }
      // Try to pick up a max coverage value from the document content if present
      let maxCov = null;
      const match = (documentContent || '').match(/max\s*coverage\s*[:\-]?\s*([0-9,]+)/i);
      if (match) maxCov = parseInt(match[1].replace(/,/g, ''), 10);

      plans.push({
        plan_name: planName,
        plan_type: 'Health',
        monthly_cost: null,
        annual_cost: null,
        deductible: null,
        max_coverage: maxCov,
        coverage_type: 'Family',
        features: features.length ? features : ['Standard benefits as listed in document'],
        eligibility_criteria: null,
        exclusions: null,
      });

      return { provider_name: provider, plans };
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // include optional metadata (filename, tables) to give the model more context
    let metadata = '';
    if (options.filename) {
      metadata += `Filename: ${options.filename}\n`;
    }
    if (options.tables && Array.isArray(options.tables) && options.tables.length > 0) {
      metadata += '\n-- TABLES (CSV) INCLUDED BELOW --\n';
      options.tables.forEach((t, idx) => {
        metadata += `\n[Sheet: ${t.sheetName}]\n`;
        // provide a concise CSV snippet (limit size)
        const csv = t.csv || '';
        metadata += csv.substring(0, 2000) + (csv.length > 2000 ? '\n... (truncated)' : '') + '\n';
      });
      metadata += '\n-- END TABLES --\n\n';
    }

    const prompt = `${PLAN_EXTRACTION_PROMPT}\n\n${metadata}Document Content:\n${documentContent}\n\nExtract the insurance plan data and return ONLY valid JSON, no markdown formatting:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    console.log('Raw Gemini response length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to extract JSON from the response
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      throw new Error('Failed to extract valid JSON from AI response. Response was: ' + text.substring(0, 200));
    }
    
    let planData;
    try {
      planData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', jsonMatch[0].substring(0, 500));
      throw new Error('Failed to parse JSON from AI response: ' + parseError.message);
    }
    
    // Validate the structure
    if (!planData.plans || !Array.isArray(planData.plans)) {
      console.error('Invalid structure - missing plans array:', JSON.stringify(planData, null, 2));
      throw new Error('Invalid plan data structure - missing plans array');
    }
    
    if (planData.plans.length === 0) {
      throw new Error('No plans found in document');
    }
    
    // If provider_name is null or missing, try to extract from filename or use default
    if (!planData.provider_name || planData.provider_name === null) {
      console.warn('⚠️  Provider name not found in document, using default');
      planData.provider_name = 'Unknown Provider';
    }
    
    console.log(`✅ Successfully extracted ${planData.plans.length} plan(s) from ${planData.provider_name}`);
    
    return planData;
  } catch (error) {
    console.error('Gemini API Error (Extraction):', error);
    throw new Error('Failed to extract plan data from document: ' + error.message);
  }
}

/**
 * Test Gemini API connection
 * @returns {Promise<boolean>}
 */
export async function testGeminiConnection() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Hello');
    const response = await result.response;
    const text = response.text();
    return text.length > 0;
  } catch (error) {
    console.error('Gemini API connection test failed:', error);
    return false;
  }
}

export default {
  chatWithAdvisor,
  extractPlanData,
  testGeminiConnection
};

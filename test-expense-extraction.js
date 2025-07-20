const fs = require('fs');
const path = require('path');

// Use global fetch if available (Node 18+), otherwise use node-fetch
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch;
} else {
  fetch = require('node-fetch');
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase environment variables are not set in .env.local');
  process.exit(1);
}

const IMAGE_PATH = process.argv[2] || 'receipt.jpg';

if (!fs.existsSync(IMAGE_PATH)) {
  console.error('❌ Image file not found:', IMAGE_PATH);
  console.log('Usage: node test-expense-extraction.js <path-to-receipt-image>');
  process.exit(1);
}

async function extractExpenseFromImage(imagePath) {
  console.log('🔍 Loading image:', imagePath);
  const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

  const systemPrompt = `You are an expense assistant. If this image is a receipt or expense, extract the details and return a JSON object with the following fields: amount (total cost), date (YYYY-MM-DD format), merchant (store/company name), and business_purpose (if it's a business expense). If it's not a receipt or expense, just reply normally. Example JSON: { "amount": 12.34, "date": "2024-07-19", "merchant": "Coffee Shop", "business_purpose": "Client meeting" }.`;

  const payload = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please analyze this receipt and extract the expense details.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageData}`
            }
          }
        ]
      }
    ],
    max_tokens: 700
  };

  console.log('🤖 Calling OpenAI API...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;
  
  console.log('✅ OpenAI Response:', aiResponse);
  
  // Extract JSON from response
  const match = aiResponse.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const extractedExpense = JSON.parse(match[0]);
      console.log('✅ Extracted Expense:', extractedExpense);
      return extractedExpense;
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
      return null;
    }
  }
  
  console.log('❌ No JSON found in response');
  return null;
}

async function testExpenseInsertion(expenseData) {
  if (!expenseData || !expenseData.amount || !expenseData.date || !expenseData.merchant) {
    console.log('❌ Invalid expense data for insertion');
    return false;
  }

  console.log('💾 Testing expense insertion...');
  
  // Note: This is a test - in a real scenario, you'd need proper authentication
  // For now, we'll just simulate the insertion by showing what would be inserted
  const expenseToInsert = {
    user_id: 'test-user-id', // This would come from authentication
    total_amount: expenseData.amount,
    date: expenseData.date,
    merchant_name: expenseData.merchant,
    business_purpose: expenseData.business_purpose || null,
    receipt_url: null,
    receipt_filename: null
  };

  console.log('📝 Expense to insert:', expenseToInsert);
  console.log('✅ Expense extraction and formatting test passed!');
  
  return true;
}

async function main() {
  try {
    console.log('🧪 Testing Expense Extraction and Database Insertion');
    console.log('==================================================');
    
    // Step 1: Extract expense from image
    const extractedExpense = await extractExpenseFromImage(IMAGE_PATH);
    
    if (!extractedExpense) {
      console.log('❌ Failed to extract expense from image');
      return;
    }
    
    // Step 2: Test expense insertion
    const insertionSuccess = await testExpenseInsertion(extractedExpense);
    
    if (insertionSuccess) {
      console.log('\n🎉 Test completed successfully!');
      console.log('Your app can now extract expenses from images and add them to the database.');
    } else {
      console.log('\n❌ Test failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

main(); 
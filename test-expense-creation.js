const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExpenseCreation() {
  try {
    console.log('🧪 Testing expense creation...');
    
    // Test data similar to what would be extracted from a receipt
    const testExpense = {
      user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      total_amount: 25.50,
      date: '2024-07-16',
      merchant_name: 'Test Coffee Shop',
      business_purpose: 'Client meeting',
      receipt_url: null,
      receipt_filename: null
    };

    console.log('📝 Attempting to insert test expense:', testExpense);

    const { data, error } = await supabase
      .from('expenses')
      .insert(testExpense)
      .select();

    if (error) {
      console.error('❌ Error inserting test expense:', error);
      console.log('💡 This tells us what\'s wrong with expense creation');
      return;
    }

    console.log('✅ Test expense inserted successfully:', data);

    // Check if we can read it back
    const { data: readExpense, error: readError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', data[0].id)
      .single();

    if (readError) {
      console.error('❌ Error reading back test expense:', readError);
      return;
    }

    console.log('✅ Successfully read back test expense:', readExpense);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testExpenseCreation(); 
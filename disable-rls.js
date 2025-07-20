const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLS() {
  try {
    console.log('🔧 Temporarily disabling RLS for testing...');
    
    // Test if we can insert into telegram_messages now
    const testMessage = {
      telegram_id: 132688762, // Your telegram ID
      user_id: '73a74c90-fe77-46e6-8cde-21c3e987940a', // Your user ID
      message: 'Test message after RLS fix',
      type: 'text',
      original_message: 'Test original message'
    };

    console.log('📝 Testing telegram_messages insert:', testMessage);

    const { data: messageData, error: messageError } = await supabase
      .from('telegram_messages')
      .insert(testMessage)
      .select();

    if (messageError) {
      console.error('❌ Error inserting test message:', messageError);
      console.log('💡 RLS is still blocking inserts');
      return;
    }

    console.log('✅ Test message inserted successfully:', messageData);

    // Test if we can insert into expenses now
    const testExpense = {
      user_id: '73a74c90-fe77-46e6-8cde-21c3e987940a', // Your user ID
      total_amount: 25.99,
      date: '2024-07-16',
      merchant_name: 'Test Store',
      business_purpose: 'Testing RLS fix',
      receipt_url: null,
      receipt_filename: null
    };

    console.log('📝 Testing expenses insert:', testExpense);

    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .insert(testExpense)
      .select();

    if (expenseError) {
      console.error('❌ Error inserting test expense:', expenseError);
      console.log('💡 RLS is still blocking expense inserts');
      return;
    }

    console.log('✅ Test expense inserted successfully:', expenseData);

    console.log('🎉 RLS test completed successfully!');
    console.log('💡 Your Telegram bot should now be able to create expenses.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

disableRLS(); 
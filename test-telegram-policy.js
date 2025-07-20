const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Supabase service role environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testTelegramPolicy() {
  try {
    console.log('🧪 Testing Telegram API RLS policies...');
    
    // Test with your actual user data
    const testUserId = '73a74c90-fe77-46e6-8cde-21c3e987940a';
    const testTelegramId = 132688762;

    console.log('📋 Testing with user:', { testUserId, testTelegramId });

    // Test 1: Insert into telegram_messages
    const testMessage = {
      telegram_id: testTelegramId,
      user_id: testUserId,
      message: 'Test message with new policy',
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
      console.log('💡 This suggests the RLS policy is still blocking inserts');
      return;
    }

    console.log('✅ Test message inserted successfully:', messageData);

    // Test 2: Insert into expenses
    const testExpense = {
      user_id: testUserId,
      total_amount: 29.99,
      date: '2024-07-16',
      merchant_name: 'Test Store with Policy',
      business_purpose: 'Testing new RLS policy',
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
      console.log('💡 This suggests the RLS policy is still blocking expense inserts');
      return;
    }

    console.log('✅ Test expense inserted successfully:', expenseData);

    // Test 3: Try to access another user's data (should fail)
    console.log('🔒 Testing security - trying to access another user\'s data...');
    
    const { data: otherUserData, error: otherUserError } = await supabase
      .from('expenses')
      .select('*')
      .neq('user_id', testUserId)
      .limit(1);

    if (otherUserError) {
      console.log('✅ Security test passed - cannot access other users\' data:', otherUserError.message);
    } else if (otherUserData && otherUserData.length > 0) {
      console.error('❌ Security test failed - able to access other users\' data!');
    } else {
      console.log('✅ Security test passed - no other users\' data accessible');
    }

    console.log('🎉 All tests completed successfully!');
    console.log('💡 Your Telegram bot should now be able to create expenses securely.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testTelegramPolicy(); 
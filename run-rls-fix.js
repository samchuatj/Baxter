const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLS() {
  try {
    console.log('🔧 Fixing RLS policies for telegram_messages...');
    
    // Since we can't run SQL directly, let's test if the current setup works
    // by trying to insert a message with a real user ID
    
    // First, let's check if there are any telegram_users in the system
    const { data: telegramUsers, error: usersError } = await supabase
      .from('telegram_users')
      .select('*')
      .limit(1);

    if (usersError) {
      console.error('❌ Error checking telegram_users:', usersError);
      return;
    }

    console.log('📋 Found telegram users:', telegramUsers);

    if (telegramUsers && telegramUsers.length > 0) {
      const testUserId = telegramUsers[0].user_id;
      const testTelegramId = telegramUsers[0].telegram_id;

      console.log('🧪 Testing with real user:', { testUserId, testTelegramId });

      // Test inserting a message
      const { data: testMessage, error: messageError } = await supabase
        .from('telegram_messages')
        .insert({
          telegram_id: testTelegramId,
          user_id: testUserId,
          message: 'Test message from API',
          type: 'text',
          original_message: 'Test original message'
        })
        .select();

      if (messageError) {
        console.error('❌ Error inserting test message:', messageError);
        console.log('💡 This suggests we need to fix the RLS policies');
        return;
      }

      console.log('✅ Test message inserted successfully:', testMessage);

      // Test inserting an expense
      const { data: testExpense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: testUserId,
          total_amount: 15.99,
          date: '2024-07-16',
          merchant_name: 'Test Store',
          business_purpose: 'Testing',
          receipt_url: null,
          receipt_filename: null
        })
        .select();

      if (expenseError) {
        console.error('❌ Error inserting test expense:', expenseError);
        console.log('💡 This suggests we need to fix the expenses RLS policies too');
        return;
      }

      console.log('✅ Test expense inserted successfully:', testExpense);

    } else {
      console.log('⚠️ No telegram users found. You need to link your Telegram account first.');
      console.log('💡 Send /start to your bot on Telegram to link your account.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixRLS(); 
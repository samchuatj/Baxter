const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTelegramMessages() {
  try {
    console.log('🔍 Debugging telegram_messages table...');
    
    // Try to insert a test record to see what columns exist
    const testRecord = {
      telegram_id: 123456789,
      user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      message: 'Test message',
      type: 'text',
      original_message: 'Test original message'
    };

    console.log('📝 Attempting to insert test record:', testRecord);

    const { data, error } = await supabase
      .from('telegram_messages')
      .insert(testRecord)
      .select();

    if (error) {
      console.error('❌ Error inserting test record:', error);
      console.log('💡 This tells us which columns are missing or have constraints');
      return;
    }

    console.log('✅ Test record inserted successfully:', data);

    // Now let's check recent messages
    const { data: recentMessages, error: selectError } = await supabase
      .from('telegram_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (selectError) {
      console.error('❌ Error selecting recent messages:', selectError);
      return;
    }

    console.log('📋 Recent telegram messages:');
    console.table(recentMessages);

    // Check expenses table for recent entries
    const { data: recentExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (expensesError) {
      console.error('❌ Error selecting recent expenses:', expensesError);
      return;
    }

    console.log('💰 Recent expenses:');
    console.table(recentExpenses);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugTelegramMessages(); 
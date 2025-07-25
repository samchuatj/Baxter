// scripts/check-telegram-users.js
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or Service Role Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTelegramUsers() {
  console.log('🔍 Checking linked Telegram users...\n');
  
  const { data: telegramUsers, error } = await supabase
    .from('telegram_users')
    .select(`
      telegram_id,
      user_id,
      linked_at,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch Telegram users:', error);
    process.exit(1);
  }

  if (!telegramUsers || telegramUsers.length === 0) {
    console.log('📭 No linked Telegram users found in the database.');
    return;
  }

  console.log(`📊 Found ${telegramUsers.length} linked Telegram user(s):\n`);
  
  telegramUsers.forEach((user, index) => {
    console.log(`${index + 1}. Telegram ID: ${user.telegram_id}`);
    console.log(`   User ID: ${user.user_id}`);
    console.log(`   Linked at: ${user.linked_at}`);
    console.log(`   Created at: ${user.created_at}`);
    console.log('');
  });

  console.log('💡 To unlink a user, run:');
  console.log(`   node scripts/unlink-telegram.js <telegram_id>`);
  console.log('   or');
  console.log(`   TELEGRAM_ID=<telegram_id> node scripts/unlink-telegram.js`);
}

checkTelegramUsers(); 
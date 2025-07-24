// scripts/find-telegram-id.js
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or Service Role Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function findTelegramUsers() {
  console.log('🔍 Searching for linked Telegram users...');
  
  const { data, error } = await supabase
    .from('telegram_users')
    .select('telegram_id, user_id, linked_at, created_at');

  if (error) {
    console.error('Failed to fetch Telegram users:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('✅ No linked Telegram users found.');
    return;
  }

  console.log(`📱 Found ${data.length} linked Telegram user(s):`);
  console.log('');
  
  data.forEach((user, index) => {
    console.log(`${index + 1}. Telegram ID: ${user.telegram_id}`);
    console.log(`   User ID: ${user.user_id}`);
    console.log(`   Linked at: ${user.linked_at}`);
    console.log(`   Created at: ${user.created_at}`);
    console.log('');
  });

  console.log('💡 To unlink a user, run:');
  console.log(`   node scripts/unlink-telegram.js ${data[0].telegram_id}`);
  console.log('');
  console.log('Or set the TELEGRAM_ID environment variable:');
  console.log(`   TELEGRAM_ID=${data[0].telegram_id} node scripts/unlink-telegram.js`);
}

findTelegramUsers(); 
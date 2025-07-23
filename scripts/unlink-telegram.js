// scripts/unlink-telegram.js
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or Service Role Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function unlinkTelegram(telegramId) {
  if (!telegramId) {
    console.error('Please provide a Telegram ID as TELEGRAM_ID environment variable or argument.');
    process.exit(1);
  }
  const { error } = await supabase
    .from('telegram_users')
    .delete()
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('Failed to unlink:', error);
    process.exit(1);
  } else {
    console.log('Unlinked Telegram user:', telegramId);
  }
}

const telegramId = process.env.TELEGRAM_ID || process.argv[2];
unlinkTelegram(telegramId); 
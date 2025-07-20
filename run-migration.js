const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔧 Running migration to update telegram_messages table...');
    
    // Add missing columns
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE telegram_messages 
        ADD COLUMN IF NOT EXISTS ai_response TEXT,
        ADD COLUMN IF NOT EXISTS expense_json TEXT,
        ADD COLUMN IF NOT EXISTS expense_created BOOLEAN DEFAULT FALSE;
      `
    });

    if (alterError) {
      console.error('❌ Error running migration:', alterError);
      return;
    }

    console.log('✅ Migration completed successfully!');
    
    // Verify the table structure
    const { data: columns, error: describeError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'telegram_messages' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (describeError) {
      console.error('❌ Error describing table:', describeError);
      return;
    }

    console.log('📋 Current telegram_messages table structure:');
    console.table(columns);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

runMigration(); 
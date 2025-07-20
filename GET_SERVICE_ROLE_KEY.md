# Getting Your Supabase Service Role Key

To properly authenticate API routes for Telegram bot operations, you need a service role key from Supabase.

## Steps to Get Service Role Key:

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `bkebrjjydeoaqpmpyciy`

2. **Navigate to Settings**
   - Click on the gear icon (Settings) in the left sidebar
   - Select "API" from the settings menu

3. **Copy the Service Role Key**
   - Look for "service_role" key (not the anon key)
   - Click "Copy" to copy the key
   - **⚠️ Keep this key secret - it has admin privileges**

4. **Add to Environment Variables**
   - Add this line to your `.env.local` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Why We Need This:

- The service role key bypasses RLS policies
- It allows the API route to act on behalf of any user
- It's the secure way to handle server-side operations
- The anon key is restricted by RLS policies

## Security Note:

- Never expose the service role key in client-side code
- Only use it in server-side API routes
- The service role key has full database access 
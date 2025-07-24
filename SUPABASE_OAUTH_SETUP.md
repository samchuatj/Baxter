# Supabase OAuth Configuration Guide

This guide will help you configure Supabase OAuth redirect URLs properly to fix the Telegram auth flow.

## Step 1: Configure Supabase OAuth Redirect URLs

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your Baxter project

2. **Navigate to Authentication Settings**
   - Go to **Authentication** → **URL Configuration**
   - Or go to **Settings** → **Auth** → **URL Configuration**

3. **Configure Redirect URLs**
   Add these URLs to the **Redirect URLs** section:

   ```
   https://baxterai.onrender.com/auth/callback
   http://localhost:3000/auth/callback
   ```

4. **Save the Configuration**
   - Click **Save** to apply the changes

## Step 2: Verify Google OAuth Provider

1. **Go to Authentication Providers**
   - Navigate to **Authentication** → **Providers**
   - Or go to **Settings** → **Auth** → **Providers**

2. **Configure Google Provider**
   - Find **Google** in the list
   - Make sure it's **Enabled**
   - Verify the **Client ID** and **Client Secret** are set correctly

3. **Set Redirect URL in Google Console**
   - Go to https://console.cloud.google.com/
   - Navigate to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID
   - Add this redirect URL to **Authorized redirect URIs**:
     ```
     https://bkebrjjydeoaqpmpyciy.supabase.co/auth/v1/callback
     ```
   - Replace `bkebrjjydeoaqpmpyciy` with your actual Supabase project reference

## Step 3: Test the Configuration

1. **Clear browser cache and cookies**
2. **Try the Telegram auth flow again**
3. **Check the console logs** for any errors

## Common Issues and Solutions

### Issue: "bad_oauth_callback" error
**Solution**: Make sure the redirect URL in Google Console matches exactly:
```
https://bkebrjjydeoaqpmpyciy.supabase.co/auth/v1/callback
```

### Issue: Redirect not working
**Solution**: Verify that the redirect URLs in Supabase dashboard include:
```
https://baxterai.onrender.com/auth/callback
```

### Issue: Session storage not persisting
**Solution**: This is expected behavior. The current implementation uses sessionStorage which should work for the OAuth flow.

## Environment Variables

Make sure these are set correctly in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bkebrjjydeoaqpmpyciy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_URL=https://baxterai.onrender.com
```

## Testing the Flow

1. **Start your bot**: `pnpm bot`
2. **Send `/start` to your Telegram bot**
3. **Click the magic link**
4. **Sign in with Google**
5. **Should redirect to Telegram auth page**

If the flow still doesn't work after this configuration, the issue might be with the sessionStorage timing. We can implement a more robust solution using Supabase's built-in redirect handling. 
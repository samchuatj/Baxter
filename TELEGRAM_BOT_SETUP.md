# Telegram Bot Setup Guide

This guide will help you set up the Telegram bot integration with your Baxter expense management app.

## Prerequisites

1. A Telegram account
2. Your Baxter app running with Supabase configured
3. Node.js and pnpm installed

## Step 1: Create a Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Send `/newbot`** to BotFather
3. **Choose a name** for your bot (e.g., "Baxter Expense Manager")
4. **Choose a username** for your bot (must end with 'bot', e.g., "baxter_expense_bot")
5. **Copy the bot token** that BotFather gives you
6. **Note your bot username** (e.g., "baxter_expense_bot")

## Step 2: Set Up Environment Variables

Add these variables to your `.env.local` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Set Up the Database

Run the SQL script to create the telegram_users table:

```bash
# In your Supabase SQL editor, run:
# Copy the contents of scripts/008_create_telegram_users_table.sql
```

## Step 4: Start the Bot

In a separate terminal, start the Telegram bot:

```bash
pnpm bot
```

You should see: `🤖 Telegram bot started`

## Step 5: Test the Integration

1. **Open Telegram** and search for your bot
2. **Send `/start`** to your bot
3. **Click the magic link** that the bot sends you
4. **Sign in to your Baxter account** (or create one if you don't have it)
5. **Your accounts will be linked!**

## How It Works

### Step 1: User sends `/start`
- User initiates the bot with the `/start` command
- Bot checks if the user is already linked

### Step 2: Bot replies with magic login link
- Bot generates a unique authentication token
- Bot sends a magic link with the token and Telegram ID
- Link expires in 10 minutes for security

### Step 3: After login, backend stores the mapping
- User clicks the magic link and signs in
- Backend creates a record in `telegram_users` table:
  ```sql
  telegram_id | user_id | linked_at
  12345678    | uuid... | timestamp
  ```

## Security Features

- **Token expiration**: Magic links expire after 10 minutes
- **One-time use**: Each token can only be used once
- **User verification**: Only authenticated users can link accounts
- **Duplicate prevention**: Each Telegram ID can only be linked to one user
- **Row Level Security**: Users can only see their own mappings

## API Endpoints

- `POST /api/telegram/link` - Links a Telegram user to a Supabase user

## Database Schema

```sql
CREATE TABLE telegram_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting

### Bot not responding
- Check if the bot is running: `pnpm bot`
- Verify your bot token is correct
- Make sure the bot is not blocked by Telegram

### Magic link not working
- Check if the link has expired (10 minutes)
- Verify you're signed in to your Baxter account
- Check the browser console for errors

### Database errors
- Run the SQL script in Supabase
- Check if RLS policies are set up correctly
- Verify your Supabase credentials

## Next Steps

Once the basic authentication is working, you can extend the bot with features like:

- Expense tracking commands (`/add`, `/list`, `/summary`)
- Receipt upload via Telegram
- Expense notifications
- Budget alerts
- **Export functionality** - Users can request PDF, CSV, and Excel exports of their transactions

## Production Considerations

For production deployment:

1. **Use Redis or database** instead of in-memory storage for pending auth
2. **Add rate limiting** to prevent abuse
3. **Use HTTPS** for all webhook URLs
4. **Add logging** for debugging
5. **Set up monitoring** for bot health
6. **Use environment-specific** bot tokens 
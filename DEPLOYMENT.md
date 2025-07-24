# Baxter Deployment Guide

This guide will help you deploy your Baxter expense management app to production.

## Prerequisites

1. **Supabase Project** - Set up and configured
2. **Telegram Bot** - Created with BotFather
3. **OpenAI API Key** - For receipt processing
4. **Render Account** - For hosting

## Environment Variables

You'll need to set these environment variables in your Render dashboard:

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://baxterai.onrender.com
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment Steps

### 1. Deploy to Render

1. **Connect your GitHub repository** to Render
2. **Create a new Web Service** for the main app
3. **Create a new Worker Service** for the Telegram bot
4. **Set environment variables** for both services
5. **Deploy**

### 2. Configure Supabase

1. **Set OAuth Redirect URLs** in Supabase Dashboard:
   - Go to Authentication → URL Configuration
   - Add: `https://baxterai.onrender.com/auth/callback`

2. **Configure Google OAuth** (if using):
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 3. Configure Telegram Bot

1. **Set webhook URL** in your bot:
   - URL: `https://baxterai.onrender.com/api/telegram/webhook`
   - Method: POST

2. **Test the bot** by sending `/start`

## Services

### Web Service (Main App)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Node.js

### Worker Service (Telegram Bot)
- **Build Command**: `npm install`
- **Start Command**: `npm run bot`
- **Environment**: Node.js

## Post-Deployment Checklist

- [ ] Web app is accessible at `https://baxterai.onrender.com`
- [ ] Telegram bot responds to `/start`
- [ ] OAuth login works
- [ ] Expense tracking works
- [ ] Receipt upload works
- [ ] Database connections work

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check if worker service is running
   - Verify TELEGRAM_BOT_TOKEN is set correctly
   - Check webhook URL configuration

2. **OAuth not working**
   - Verify redirect URLs in Supabase
   - Check NEXT_PUBLIC_APP_URL is correct
   - Clear browser cache

3. **Database errors**
   - Verify Supabase environment variables
   - Check RLS policies are set up
   - Ensure service role key has proper permissions

### Logs

Check Render logs for both services:
- Web service logs for app errors
- Worker service logs for bot errors

## Monitoring

- Set up alerts for service downtime
- Monitor bot response times
- Track API usage and costs 
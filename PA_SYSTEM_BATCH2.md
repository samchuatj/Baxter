# PA System - Batch 2: Group Chat Registration

## What Was Implemented

### 1. Enhanced Telegram Bot
- **File**: `lib/telegram-bot.ts` (updated)
- **New Commands**:
  - `/register` - Register a group chat for PA management
  - `/list-groups` - List all registered group chats

### 2. API Endpoint
- **File**: `app/api/pa/register-group/route.ts`
- **Purpose**: Handle group chat registration via web interface

### 3. Web Registration Page
- **File**: `app/pa/register-group/page.tsx`
- **Purpose**: User-friendly interface for group registration

### 4. Test Script
- **File**: `scripts/test-batch2-group-registration.js`
- **Purpose**: Verify group registration functionality

## How to Test Batch 2

### Step 1: Test the API Endpoint
```bash
# Run the test script
node scripts/test-batch2-group-registration.js
```

### Step 2: Test with Real Telegram Bot
1. **Add bot to a group chat**
2. **Send `/register` in the group**
3. **Click the registration link**
4. **Verify group is registered**

### Expected Test Output:
```
🧪 Testing Batch 2: Group Chat Registration...

1. Checking for test user...
✅ Found test user: [user-id]

2. Creating test Telegram user link...
✅ Created Telegram user link

3. Testing group chat registration flow...
✅ Created registration token

4. Testing group registration API...
API URL: [your-app-url]/api/pa/register-group
API Response: { success: true, data: { group_id: "...", chat_id: 987654321, message: "..." } }
✅ Group registration API working correctly

5. Verifying group chat was created...
✅ Group chat registered successfully
   Group ID: [uuid]
   Chat ID: 987654321
   User ID: [user-id]

6. Testing group listing...
✅ Found 1 group(s) for user
   1. Chat ID: 987654321, Title: Group Chat 987654321

7. Cleaning up test data...
✅ Test data cleaned up

🎉 Batch 2 tests completed successfully!
Group chat registration is working correctly.
```

## User Flow

### 1. Group Registration Process
```
User → Adds bot to group → Sends /register → Clicks link → Group registered
```

### 2. Bot Commands Available
- **`/register`** - Register current group chat
- **`/list-groups`** - List all registered groups
- **`/start`** - Link Telegram account (existing)

### 3. Security Features
- ✅ **Token expiration** - Registration links expire in 10 minutes
- ✅ **User verification** - Only linked users can register groups
- ✅ **Duplicate prevention** - Groups can only be registered once
- ✅ **Authentication required** - Users must be logged in to register

## API Endpoints

### POST `/api/pa/register-group`
**Purpose**: Register a group chat for PA management

**Request Body**:
```json
{
  "token": "registration_token",
  "chatId": 123456789,
  "telegramId": 987654321
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "group_id": "uuid",
    "chat_id": 123456789,
    "message": "Group chat registered successfully!"
  }
}
```

## Database Changes

### New Records Created
- **`group_chats`** table entries for registered groups
- **`pending_auth`** table entries for registration tokens

### Data Flow
1. User sends `/register` → Bot creates pending auth token
2. User clicks link → Web page validates token
3. API registers group → Creates group_chats record
4. Token cleaned up → Removes pending_auth record

## Error Handling

### Common Error Scenarios
1. **"This command only works in group chats"**
   - User tried `/register` in private chat
   - Solution: Add bot to group chat first

2. **"You need to link your Telegram account first"**
   - User not linked to Baxter account
   - Solution: Send `/start` in private chat first

3. **"This group chat is already registered"**
   - Group already registered
   - Solution: Use existing group or register different group

4. **"Registration link expired"**
   - Token expired (10 minutes)
   - Solution: Send `/register` again for new link

## Bot Command Details

### `/register`
- **Works in**: Group chats only
- **Requires**: Linked Telegram account
- **Action**: Generates registration link
- **Output**: Magic link for web registration

### `/list-groups`
- **Works in**: Any chat (private or group)
- **Requires**: Linked Telegram account
- **Action**: Lists all registered groups
- **Output**: Formatted list of groups

## Web Interface Features

### Registration Page (`/pa/register-group`)
- **Authentication flow** - Redirects to login if needed
- **Token validation** - Verifies registration token
- **Success/error states** - Clear feedback to user
- **Session storage** - Preserves registration data during auth

### User Experience
1. **Click registration link** → Redirected to web page
2. **If not logged in** → Redirected to login
3. **After login** → Automatically completes registration
4. **Success message** → Clear confirmation

## Next Steps

Once Batch 2 is tested and working:

1. **Batch 3**: PA Addition & Basic Bot Commands
   - Add/remove PA functionality
   - PA management commands
   - Group-specific PA operations

2. **Batch 4**: Magic Link Web Access
   - PA web interface access
   - Token-based authentication
   - PA dashboard

## Troubleshooting

### Common Issues

1. **"Bot not responding to commands"**
   - Check if bot is running: `pnpm bot`
   - Verify bot token is correct
   - Ensure bot is added to group

2. **"Registration link not working"**
   - Check if link has expired (10 minutes)
   - Verify user is logged in to Baxter account
   - Check browser console for errors

3. **"API errors"**
   - Verify database tables exist
   - Check RLS policies are set up
   - Ensure service role key is configured

### Environment Variables
Make sure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=your_app_url
TELEGRAM_BOT_TOKEN=your_bot_token
```

## Success Criteria

✅ **Batch 2 is complete when:**
- Bot responds to `/register` and `/list-groups` commands
- Group registration API works correctly
- Web registration page functions properly
- Test script runs without errors
- Users can successfully register group chats

**Ready for Batch 3?** Once you've successfully tested Batch 2, let me know and we'll proceed with implementing PA addition and management commands! 
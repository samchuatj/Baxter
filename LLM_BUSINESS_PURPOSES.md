# LLM Business Purpose Management

The Telegram bot now supports comprehensive business purpose management through natural language commands. Users can add, remove, list, and view their business purposes directly through the bot interface.

## Features

### ✅ Add Business Purposes
Users can create new custom business purposes that are only visible to them.

**Commands:**
- "Add business purpose [name]"
- "Create category [name]"
- "New business purpose [name]"

**Example:**
```
User: "Add business purpose Office Supplies"
Bot: "🏷️ Please confirm adding this new business purpose:

Name: "Office Supplies"

Reply with "yes" or "confirm" to add this business purpose, or "no" to cancel."

User: "yes"
Bot: "✅ Business purpose "Office Supplies" added successfully! 🎉"
```

### 📋 List Business Purposes
Users can view all their available business purposes, including default and custom categories.

**Commands:**
- "List business purposes"
- "Show categories"
- "What categories do I have"
- "Show my business purposes"

**Example:**
```
User: "List business purposes"
Bot: "📋 Your Business Purpose Categories:

👑 Default Categories:
• Food
• Software Subscription
• Travel
• Others

👤 Your Custom Categories:
• Office Supplies
• Marketing
• Client Entertainment"
```

### 🗑️ Remove Business Purposes
Users can remove their custom business purposes (default categories cannot be deleted).

**Commands:**
- "Remove business purpose [name]"
- "Delete category [name]"
- "Remove category [name]"

**Example:**
```
User: "Remove business purpose Office Supplies"
Bot: "✅ Business purpose "Office Supplies" removed successfully! 🗑️"
```

**Safety Checks:**
- Cannot remove default categories (Travel, Food, Software Subscription, Others)
- Cannot remove categories created by other users
- Cannot remove categories that are currently being used by expenses

## Database Schema

### Business Purposes Table
```sql
CREATE TABLE business_purposes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Pending Business Purposes Table
```sql
CREATE TABLE pending_business_purposes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  purpose_data JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Features

### Row Level Security (RLS)
- Users can only see their own custom business purposes
- Users can only see default categories (available to all users)
- Users can only modify their own custom categories
- Default categories are protected from deletion

### Validation
- Business purpose names must be unique per user
- Names cannot exceed 100 characters
- Cannot delete categories in use by expenses
- Confirmation required before adding new purposes

## API Endpoints

### Business Purposes API
- `GET /api/business-purposes` - List user's business purposes
- `POST /api/business-purposes` - Create new business purpose

### Telegram Message API
- `POST /api/telegram/message` - Process LLM commands for business purposes

## LLM Integration

The system uses OpenAI's GPT-4 to understand natural language commands and convert them into structured actions:

### Supported Actions
1. **add_business_purpose** - Create new custom category
2. **list_business_purposes** - Show all available categories
3. **remove_business_purpose** - Delete custom category
4. **confirm_business_purpose** - Confirm pending addition
5. **cancel_business_purpose** - Cancel pending addition

### System Prompt
The LLM is instructed to:
- Recognize business purpose management requests
- Use appropriate actions based on user intent
- Provide helpful responses with emojis and formatting
- Handle edge cases and validation errors

## Usage Examples

### Complete Workflow
```
User: "I need to track office supplies"
Bot: "📋 Your Business Purpose Categories:

👑 Default Categories:
• Food
• Software Subscription
• Travel
• Others

👤 Your Custom Categories:
None yet. Use "add business purpose [name]" to create one!"

User: "Add business purpose Office Supplies"
Bot: "🏷️ Please confirm adding this new business purpose:

Name: "Office Supplies"

Reply with "yes" or "confirm" to add this business purpose, or "no" to cancel."

User: "yes"
Bot: "✅ Business purpose "Office Supplies" added successfully! 🎉"

User: "Now add an expense for $25.50 at Staples for office supplies"
Bot: "✅ Expense created! 🎉

💵 Amount: $25.50
🏪 Merchant: Staples
📅 Date: 2024-01-15
🏷️ Category: Office Supplies"
```

### Error Handling
```
User: "Remove business purpose Travel"
Bot: "❌ Cannot remove default business purpose "Travel". Default categories cannot be deleted. 🛡️"

User: "Remove business purpose Office Supplies"
Bot: "❌ Cannot remove "Office Supplies" because it's being used by existing expenses. Please update those expenses first. 📊"
```

## Testing

Run the test script to verify functionality:
```bash
node scripts/test-business-purpose-llm.js
```

## Setup Instructions

1. **Run the SQL scripts:**
   ```sql
   -- Run in Supabase SQL editor
   -- Copy contents of scripts/016_update_business_purposes_rls.sql
   -- Copy contents of scripts/014_create_pending_business_purposes_table.sql
   ```

2. **Deploy the updated code:**
   ```bash
   git add .
   git commit -m "feat: enable LLM business purpose management"
   git push
   ```

3. **Test with Telegram bot:**
   - Send `/start` to link your account
   - Try the commands above
   - Verify business purposes appear in the web interface

## Troubleshooting

### Common Issues

1. **"User not linked" error**
   - Send `/start` to the bot first
   - Complete the authentication process

2. **"Business purpose not found"**
   - Check spelling of the category name
   - Use "list business purposes" to see available categories

3. **"Cannot remove default category"**
   - Default categories (Travel, Food, etc.) cannot be deleted
   - Only custom categories can be removed

4. **"Category in use by expenses"**
   - Update or delete expenses using that category first
   - Then remove the business purpose

### Debug Commands
- "Show my categories" - List all business purposes
- "What can I do?" - Get help with available commands
- "Test business purposes" - Run diagnostic checks

## Future Enhancements

- Bulk import/export of business purposes
- Category templates for different business types
- Automatic categorization suggestions
- Category usage analytics
- Category sharing between team members 
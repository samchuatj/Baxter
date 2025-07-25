# Smart Expense Identification System

## Overview

The smart expense identification system is a multi-layered approach that allows the LLM to intelligently find the correct expense to edit when users make natural language requests. Instead of requiring users to know specific expense IDs or exact details, the system uses contextual clues and multiple matching criteria to identify the right expense.

## How It Works

### 1. **LLM Analysis Phase**
When a user sends an edit request, the LLM first analyzes the natural language to extract:
- **Target Expense Criteria**: What expense they want to edit
- **Update Fields**: What changes they want to make
- **Context Clues**: Additional information that might help identify the expense

### 2. **Filter Object Creation**
The LLM creates a "filter object" with as much detail as possible:

```json
{
  "action": "edit",
  "filter": {
    "date": "2024-07-19",
    "merchant": "Coffee Shop", 
    "amount": 12.34,
    "business_purpose": "Food"
  },
  "fields_to_update": {
    "total_amount": 15.50
  }
}
```

### 3. **Multi-Stage Database Query**
The system uses a sophisticated querying approach:

#### **Stage 1: Database-Level Filtering**
```typescript
// Start with user's expenses
let expenseQuery = supabase
  .from('expenses')
  .select('id, date, merchant_name, total_amount, business_purpose')
  .eq('user_id', userId)

// Add exact matches for date and amount
if (extractedAction.filter.date) {
  expenseQuery = expenseQuery.eq('date', extractedAction.filter.date)
}
if (extractedAction.filter.amount) {
  expenseQuery = expenseQuery.eq('total_amount', extractedAction.filter.amount)
}
```

#### **Stage 2: JavaScript-Level Filtering**
```typescript
// Filter for partial matches (case-insensitive)
if (extractedAction.filter.merchant) {
  matchExpenses = matchExpenses.filter(exp =>
    exp.merchant_name && 
    exp.merchant_name.toLowerCase().includes(extractedAction.filter.merchant.toLowerCase())
  )
}
if (extractedAction.filter.business_purpose) {
  matchExpenses = matchExpenses.filter(exp =>
    exp.business_purpose && 
    exp.business_purpose.toLowerCase().includes(extractedAction.filter.business_purpose.toLowerCase())
  )
}
```

## Identification Strategies

### **1. Exact Matching**
- **Date**: Specific dates like "2024-07-19" or "yesterday"
- **Amount**: Exact amounts like "$12.34"
- **Merchant**: Exact merchant names

### **2. Partial Matching**
- **Merchant**: "Coffee" matches "Coffee Shop", "Starbucks Coffee", etc.
- **Business Purpose**: "Travel" matches "Business Travel", "Personal Travel", etc.

### **3. Contextual Matching**
- **Recent Expenses**: When user says "my coffee expense", look for recent coffee-related expenses
- **Time-Based**: "yesterday's lunch" looks for food expenses from yesterday
- **Amount-Based**: "the $25 expense" looks for expenses around that amount

### **4. Smart Inference**
The LLM is trained to make intelligent guesses:
- "Change the amount to $25" → Look for the most recent expense
- "Update the merchant name" → Look for recent expenses with similar amounts
- "Fix the date to yesterday" → Look for recent expenses that might have wrong dates

## Example Scenarios

### **Scenario 1: Specific Request**
```
User: "Change the amount of my coffee expense from yesterday to $15.50"

LLM Analysis:
- Target: Coffee expense from yesterday
- Update: Amount to $15.50
- Filter: { date: "2024-07-18", business_purpose: "Food" }
- Fields: { total_amount: 15.50 }

System Query:
1. Find expenses from 2024-07-18
2. Filter for food/beverage related expenses
3. Look for coffee-related merchants
4. Update the matching expense
```

### **Scenario 2: Ambiguous Request**
```
User: "Change the amount to $25"

LLM Analysis:
- Target: Most recent expense (context needed)
- Update: Amount to $25
- Filter: { amount: [recent amount] }
- Fields: { total_amount: 25.00 }

System Query:
1. Find recent expenses
2. If multiple matches → Ask for clarification
3. If single match → Update it
```

### **Scenario 3: Contextual Request**
```
User: "That was actually a business lunch, not personal food"

LLM Analysis:
- Target: Recent food expense
- Update: Change category to business-related
- Filter: { business_purpose: "Food", date: "recent" }
- Fields: { business_purpose: "Food" }

System Query:
1. Find recent food expenses
2. Update the most recent one
```

## Error Handling

### **No Matches Found**
```
❌ Could not find any matching expense to update. 🕵️
Please check your details and try again.
```

### **Multiple Matches**
```
❌ Multiple expenses match your description. 🧐
Please be more specific (e.g., include date, merchant, and amount).
```

### **Invalid Categories**
```
⚠️ Business purpose "Invalid Category" not found. 
Available categories: Food, Travel, Software Subscription, Others
```

## LLM Guidance

The system includes specific instructions for the LLM:

```typescript
For edit requests, be smart about interpreting natural language:
- "Change the amount to $25" → Look for the most recent expense or ask for more context
- "Update the merchant name" → Look for the most recent expense with that amount/date
- "Change the category to Travel" → Look for expenses that might be travel-related
- "Fix the date to yesterday" → Look for recent expenses that might have wrong dates
- "Update my coffee expense" → Look for coffee-related expenses in recent history

When editing, always try to be specific about which expense you're targeting. 
If multiple expenses could match, ask the user to be more specific.
```

## Benefits

### **For Users**
- ✅ **Natural Language**: No need to remember exact details or IDs
- ✅ **Contextual Understanding**: System understands "my coffee expense" vs "the $25 expense"
- ✅ **Flexible Matching**: Partial matches work (e.g., "Coffee" matches "Coffee Shop")
- ✅ **Smart Defaults**: System makes intelligent guesses when context is limited

### **For the System**
- ✅ **Robust Matching**: Multiple criteria ensure accurate identification
- ✅ **Error Prevention**: Ambiguous requests are caught and clarified
- ✅ **Performance**: Database queries are optimized with exact matches first
- ✅ **Scalability**: Works with any number of expenses

## Technical Implementation

### **Database Query Optimization**
1. **Exact matches first** (date, amount) - fastest database queries
2. **Partial matches second** (merchant, category) - JavaScript filtering
3. **Contextual matching** - LLM intelligence

### **Fallback Strategies**
1. **Ask for clarification** when multiple matches found
2. **Use most recent** when context is limited
3. **Provide suggestions** when no matches found

### **Security Considerations**
- All queries are scoped to the user's own expenses
- RLS policies prevent cross-user access
- Input validation prevents injection attacks

This smart identification system makes expense editing feel natural and intuitive, while maintaining accuracy and security. 
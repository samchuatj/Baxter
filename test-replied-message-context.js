// Test script to demonstrate replied-to message context for expense editing

const testScenarios = [
  {
    name: "Reply to expense creation message",
    repliedToMessage: "✓ Expense created! 🎉\n\n💵 Amount: $25.3\n🏪 Merchant: Grab\n📅 Date: 2025-07-25\n🏷️ Category: Travel",
    userMessage: "update the amount to 15",
    expectedAction: {
      action: "edit",
      filter: {
        amount: 25.3,
        merchant: "Grab",
        date: "2025-07-25",
        business_purpose: "Travel"
      },
      fields_to_update: {
        total_amount: 15
      }
    }
  },
  {
    name: "Reply to expense summary",
    repliedToMessage: "📊 Your recent expenses:\n\n• Coffee Shop - $12.50 (Food) - 2024-07-19\n• Gas Station - $45.00 (Travel) - 2024-07-18",
    userMessage: "change the coffee amount to $15",
    expectedAction: {
      action: "edit",
      filter: {
        merchant: "Coffee Shop",
        amount: 12.50,
        business_purpose: "Food",
        date: "2024-07-19"
      },
      fields_to_update: {
        total_amount: 15
      }
    }
  },
  {
    name: "Reply to receipt download message",
    repliedToMessage: "📄 Receipt for: Starbucks - $8.75 (Food) - 2024-07-20",
    userMessage: "that was actually business travel",
    expectedAction: {
      action: "edit",
      filter: {
        merchant: "Starbucks",
        amount: 8.75,
        business_purpose: "Food",
        date: "2024-07-20"
      },
      fields_to_update: {
        business_purpose: "Travel"
      }
    }
  },
  {
    name: "Reply to expense list",
    repliedToMessage: "Here are your expenses from yesterday:\n\n1. Lunch at Restaurant - $25.00\n2. Uber ride - $18.50\n3. Coffee - $4.50",
    userMessage: "update the uber amount to $20",
    expectedAction: {
      action: "edit",
      filter: {
        merchant: "Uber",
        amount: 18.50,
        date: "2024-07-18" // yesterday
      },
      fields_to_update: {
        total_amount: 20
      }
    }
  },
  {
    name: "Reply to error message",
    repliedToMessage: "❌ Could not find any matching expense to update. 🕵️\nPlease check your details and try again.",
    userMessage: "I meant the coffee expense from yesterday",
    expectedAction: {
      action: "edit",
      filter: {
        business_purpose: "Food", // coffee is food
        date: "2024-07-18" // yesterday
      },
      fields_to_update: {
        total_amount: 15 // from previous context
      }
    }
  }
];

console.log("🧪 Testing Replied-to Message Context for Expense Editing\n");

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Replied-to Message:`);
  console.log(`   "${scenario.repliedToMessage}"`);
  console.log(`   User Message: "${scenario.userMessage}"`);
  console.log(`   Expected Action:`, scenario.expectedAction);
  console.log("");
});

console.log("📋 How Replied-to Message Context Works:");
console.log("1. User replies to a message containing expense details");
console.log("2. LLM extracts expense information from the replied-to message");
console.log("3. LLM uses those details as the primary filter criteria");
console.log("4. LLM applies the user's requested changes");
console.log("5. System finds and updates the correct expense");
console.log("");

console.log("🎯 Key Benefits:");
console.log("✅ No need to repeat expense details");
console.log("✅ Natural conversation flow");
console.log("✅ Context-aware editing");
console.log("✅ Reduced ambiguity");
console.log("✅ Better user experience");
console.log("");

console.log("💡 Example Flow:");
console.log("Bot: ✓ Expense created! 🎉");
console.log("     💵 Amount: $25.3");
console.log("     🏪 Merchant: Grab");
console.log("     📅 Date: 2025-07-25");
console.log("     🏷️ Category: Travel");
console.log("");
console.log("User: update the amount to 15");
console.log("");
console.log("Bot: ✅ Expense updated successfully! ✏️");
console.log("     💵 Amount: $15.00");
console.log("");

console.log("🔧 Technical Implementation:");
console.log("- repliedToMessage is extracted from Telegram's reply_to_message");
console.log("- LLM analyzes both the user message and replied-to message");
console.log("- Filter object is built from replied-to message details");
console.log("- Update fields are extracted from user's request");
console.log("- System finds exact match using the filter criteria"); 
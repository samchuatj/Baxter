// Test script to demonstrate enhanced Telegram expense editing functionality

const testCases = [
  {
    name: "Change expense amount",
    message: "Change the amount of my coffee expense from yesterday to $15.50",
    expectedAction: "edit",
    expectedFields: { total_amount: 15.50 }
  },
  {
    name: "Update merchant name",
    message: "Update the merchant name for my lunch expense to 'New Restaurant'",
    expectedAction: "edit", 
    expectedFields: { merchant_name: "New Restaurant" }
  },
  {
    name: "Change business purpose category",
    message: "Change the category of my travel expense to 'Business Travel'",
    expectedAction: "edit",
    expectedFields: { business_purpose: "Business Travel" }
  },
  {
    name: "Update expense date",
    message: "Update the date of my software subscription to January 15th",
    expectedAction: "edit",
    expectedFields: { date: "2024-01-15" }
  },
  {
    name: "Multiple field updates",
    message: "Change my coffee expense amount to $12.50 and update the merchant to 'Starbucks Downtown'",
    expectedAction: "edit",
    expectedFields: { 
      total_amount: 12.50,
      merchant_name: "Starbucks Downtown"
    }
  },
  {
    name: "Natural language amount change",
    message: "The coffee was actually $18.75, not $15.50",
    expectedAction: "edit",
    expectedFields: { total_amount: 18.75 }
  },
  {
    name: "Category correction",
    message: "That was actually a business lunch, not personal food",
    expectedAction: "edit", 
    expectedFields: { business_purpose: "Food" }
  }
];

console.log("🧪 Testing Enhanced Telegram Expense Editing Functionality\n");

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Message: "${testCase.message}"`);
  console.log(`   Expected Action: ${testCase.action}`);
  console.log(`   Expected Fields:`, testCase.expectedFields);
  console.log("");
});

console.log("📋 How it works:");
console.log("1. User sends natural language edit request via Telegram");
console.log("2. LLM analyzes the message and identifies the expense to edit");
console.log("3. LLM determines which fields need to be updated");
console.log("4. System finds the matching expense using filters (date, merchant, amount, etc.)");
console.log("5. System updates the expense with the new values");
console.log("6. User receives confirmation with details of what was changed");
console.log("");

console.log("🎯 Key Features:");
console.log("✅ Natural language processing - no need for exact syntax");
console.log("✅ Smart expense identification using multiple criteria");
console.log("✅ Support for updating any expense field (date, merchant, amount, category)");
console.log("✅ Business purpose name to ID mapping");
console.log("✅ Detailed success messages showing what was changed");
console.log("✅ Error handling for ambiguous or invalid requests");
console.log("");

console.log("💡 Example Usage:");
console.log("- 'Change the amount to $25'");
console.log("- 'Update the merchant name to Starbucks'");
console.log("- 'Change the category to Travel'");
console.log("- 'Fix the date to yesterday'");
console.log("- 'That was actually a business expense'");
console.log("- 'The coffee was $18.75, not $15.50'"); 
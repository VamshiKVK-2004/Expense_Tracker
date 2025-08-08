// utils/aiSuggestions.js
function getAISuggestions(expenses) {
  // Mock logic: if user spends a lot on a category, suggest saving
  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  const tips = [];
  for (const [cat, total] of Object.entries(categoryTotals)) {
    if (total > 200) tips.push(`Consider reducing your spending on ${cat}.`);
  }
  if (tips.length === 0) tips.push("Great job managing your expenses!");
  return tips;
}

module.exports = { getAISuggestions };
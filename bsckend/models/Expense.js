// backend/models/Expense.js
const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    default: "General"
  },
  date: {
    type: String, // stored as string (e.g. '2025-05-30')
    default: () => new Date().toISOString().substring(0, 10)
  },
  note: {
    type: String,
    default: ""
  },
  paymentMethod: {
    type: String,
    default: "Cash"
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrenceType: {
    type: String,
    enum: ["none", "daily", "weekly", "monthly", "yearly"],
    default: "none"
  }
});

module.exports = mongoose.model("Expense", ExpenseSchema);

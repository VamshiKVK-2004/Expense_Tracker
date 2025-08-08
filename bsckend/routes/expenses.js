// backend/routes/expenses.js
const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { generateExpensePDF } = require("../../utils/pdfExport");
const path = require("path");
const auth = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(auth);

// GET all expenses for the authenticated user
router.get("/", expenseController.getAllExpenses);

// GET single expense
router.get("/:id", expenseController.getExpense);

// POST a new expense
router.post("/", expenseController.createExpense);

// PUT update an expense
router.put("/:id", expenseController.updateExpense);

// DELETE an expense by ID
router.delete("/:id", expenseController.deleteExpense);

// POST export PDF
router.post("/export-pdf", async (req, res) => {
  try {
    const { expenses, startDate, endDate } = req.body;
    const outputPath = path.join(__dirname, "../temp", `expense-summary-${Date.now()}.pdf`);
    
    generateExpensePDF(expenses, startDate, endDate, outputPath);
    
    res.download(outputPath, `expense-summary-${startDate}-to-${endDate}.pdf`, (err) => {
      if (err) {
        res.status(500).json({ message: "Failed to download PDF" });
      }
      // Clean up temp file
      require("fs").unlink(outputPath, () => {});
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

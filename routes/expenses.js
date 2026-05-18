const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all expenses
router.get("/", (req, res) => {
  db.query("SELECT * FROM expenses ORDER BY date DESC", (err, result) => {
    if (err) {
      console.error("Error fetching expenses:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

// ADD expense
router.post("/", (req, res) => {
  const { description, amount, date } = req.body;
  
  if (!description || !amount || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const sql = "INSERT INTO expenses (description, amount, date) VALUES (?, ?, ?)";
  db.query(sql, [description, amount, date], (err, result) => {
    if (err) {
      console.error("Error adding expense:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Expense added", id: result.insertId });
  });
});

module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all customers
router.get("/", (req, res) => {
  db.query("SELECT * FROM customers ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result || []);
  });
});

// GET single customer
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM customers WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0] || null);
  });
});

// SEARCH customers
router.get("/search/:query", (req, res) => {
  const query = `%${req.params.query}%`;
  const sql = `
    SELECT * FROM customers 
    WHERE first_name LIKE ? 
    OR last_name LIKE ? 
    OR id_number LIKE ? 
    OR phone LIKE ?
    OR email LIKE ?
    ORDER BY created_at DESC
    LIMIT 20
  `;
  db.query(sql, [query, query, query, query, query], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result || []);
  });
});

// ADD customer
router.post("/", (req, res) => {
  const { first_name, last_name, id_number, email, phone, alternative_phone, address, city } = req.body;
  
  const sql = `
    INSERT INTO customers 
    (first_name, last_name, id_number, email, phone, alternative_phone, address, city) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [first_name, last_name, id_number, email, phone, alternative_phone, address, city], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Customer added", id: result.insertId });
  });
});

// UPDATE customer
router.put("/:id", (req, res) => {
  const { first_name, last_name, id_number, email, phone, alternative_phone, address, city } = req.body;
  
  const sql = `
    UPDATE customers 
    SET first_name = ?, last_name = ?, id_number = ?, email = ?, 
        phone = ?, alternative_phone = ?, address = ?, city = ?
    WHERE id = ?
  `;
  
  db.query(sql, [first_name, last_name, id_number, email, phone, alternative_phone, address, city, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Customer updated" });
  });
});

module.exports = router;
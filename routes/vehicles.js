const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all vehicles
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      id, 
      vehicle_name,
      make, 
      model, 
      year, 
      purchase_price,
      repair_cost,
      total_cost,
      selling_price,
      profit,
      vin, 
      quantity, 
      status,
      created_at
    FROM vehicles 
    ORDER BY id DESC
  `;
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching vehicles:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

// GET available vehicles (for sales dropdown)
router.get("/available", (req, res) => {
  const sql = `
    SELECT 
      id, 
      vehicle_name,
      make, 
      model, 
      year, 
      selling_price as price,
      quantity,
      status
    FROM vehicles 
    WHERE quantity > 0 AND status != 'sold'
    ORDER BY make, model
  `;
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching available vehicles:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

// GET single vehicle
router.get("/:id", (req, res) => {
  const sql = `
    SELECT 
      id, 
      vehicle_name,
      make, 
      model, 
      year, 
      purchase_price,
      repair_cost,
      total_cost,
      selling_price,
      profit,
      vin, 
      quantity, 
      status
    FROM vehicles 
    WHERE id = ?
  `;
  
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error("Error fetching vehicle:", err);
      return res.status(500).json({ error: err.message });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    res.json(result[0]);
  });
});

// ADD new vehicle
router.post("/", (req, res) => {
  const { 
    vehicle_name, make, model, year, 
    purchase_price, repair_cost, selling_price, 
    vin, quantity, status 
  } = req.body;
  
  // Validate required fields
  if (!vehicle_name || !make || !model || !year || !purchase_price || !selling_price) {
    return res.status(400).json({ 
      error: "Missing required fields: vehicle_name, make, model, year, purchase_price, selling_price" 
    });
  }
  
  const sql = `
    INSERT INTO vehicles 
    (vehicle_name, make, model, year, purchase_price, repair_cost, selling_price, vin, quantity, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [
    vehicle_name, make, model, year, 
    purchase_price, repair_cost || 0, selling_price, 
    vin || null, quantity || 1, status || 'available'
  ], (err, result) => {
    if (err) {
      console.error("Error adding vehicle:", err);
      return res.status(500).json({ error: err.message });
    }
    
    const total_cost = (parseFloat(purchase_price) + parseFloat(repair_cost || 0));
    const profit = (parseFloat(selling_price) - total_cost);
    
    res.json({ 
      message: "Vehicle added successfully", 
      id: result.insertId,
      total_cost: total_cost,
      potential_profit: profit
    });
  });
});

// UPDATE vehicle
router.put("/:id", (req, res) => {
  const { 
    vehicle_name, make, model, year, 
    purchase_price, repair_cost, selling_price, 
    vin, quantity, status 
  } = req.body;
  
  const sql = `
    UPDATE vehicles 
    SET vehicle_name = ?, 
        make = ?, 
        model = ?, 
        year = ?, 
        purchase_price = ?, 
        repair_cost = ?, 
        selling_price = ?, 
        vin = ?, 
        quantity = ?, 
        status = ?
    WHERE id = ?
  `;
  
  db.query(sql, [
    vehicle_name, make, model, year, 
    purchase_price, repair_cost || 0, selling_price, 
    vin || null, quantity, status, 
    req.params.id
  ], (err, result) => {
    if (err) {
      console.error("Error updating vehicle:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    
    res.json({ message: "Vehicle updated successfully" });
  });
});

// DELETE vehicle
router.delete("/:id", (req, res) => {
  // Check if vehicle has sales
  db.query("SELECT COUNT(*) as count FROM sales WHERE vehicle_id = ?", [req.params.id], (err, result) => {
    if (err) {
      console.error("Error checking sales:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete vehicle with sales records" });
    }
    
    db.query("DELETE FROM vehicles WHERE id = ?", [req.params.id], (err, result) => {
      if (err) {
        console.error("Error deleting vehicle:", err);
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      
      res.json({ message: "Vehicle deleted successfully" });
    });
  });
});

// GET profit summary
router.get("/summary/profit", (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_vehicles,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_vehicles,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_vehicles,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_vehicles,
      SUM(CASE WHEN quantity > 0 AND quantity <= 2 THEN 1 ELSE 0 END) as low_stock_vehicles,
      COALESCE(SUM(purchase_price + COALESCE(repair_cost, 0)), 0) as total_investment,
      COALESCE(SUM(selling_price), 0) as total_potential_revenue,
      COALESCE(SUM(selling_price - (purchase_price + COALESCE(repair_cost, 0))), 0) as total_potential_profit,
      COALESCE(AVG(selling_price - (purchase_price + COALESCE(repair_cost, 0))), 0) as average_profit_per_vehicle
    FROM vehicles
  `;
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error getting summary:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result[0]);
  });
});

module.exports = router;
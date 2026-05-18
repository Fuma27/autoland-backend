const express = require("express");
const router = express.Router();
const db = require("../db");

// GET maintenance records for a vehicle
router.get("/:vehicleId/maintenance", (req, res) => {
  const sql = `
    SELECT * FROM maintenance_records 
    WHERE vehicle_id = ? 
    ORDER BY maintenance_date DESC
  `;
  
  db.query(sql, [req.params.vehicleId], (err, result) => {
    if (err) {
      console.error("Error fetching maintenance records:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

// ADD maintenance record
router.post("/maintenance", (req, res) => {
  const { vehicle_id, maintenance_date, maintenance_type, description, cost, mechanic_name, next_maintenance_date } = req.body;
  
  const sql = `
    INSERT INTO maintenance_records 
    (vehicle_id, maintenance_date, maintenance_type, description, cost, mechanic_name, next_maintenance_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [vehicle_id, maintenance_date, maintenance_type, description, cost, mechanic_name, next_maintenance_date], (err, result) => {
    if (err) {
      console.error("Error adding maintenance record:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Maintenance record added", id: result.insertId });
  });
});

// GET repair history for a vehicle
router.get("/:vehicleId/repairs", (req, res) => {
  const sql = `
    SELECT * FROM repair_history 
    WHERE vehicle_id = ? 
    ORDER BY repair_date DESC
  `;
  
  db.query(sql, [req.params.vehicleId], (err, result) => {
    if (err) {
      console.error("Error fetching repair history:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

// ADD repair record
router.post("/repairs", (req, res) => {
  const { vehicle_id, repair_date, repair_type, description, parts_cost, labor_cost, mechanic_name, warranty_months } = req.body;
  
  const sql = `
    INSERT INTO repair_history 
    (vehicle_id, repair_date, repair_type, description, parts_cost, labor_cost, mechanic_name, warranty_months) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, [vehicle_id, repair_date, repair_type, description, parts_cost || 0, labor_cost || 0, mechanic_name, warranty_months || 0], (err, result) => {
    if (err) {
      console.error("Error adding repair record:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Repair record added", id: result.insertId });
  });
});

// GET complete vehicle details with all info
router.get("/:vehicleId/complete", (req, res) => {
  const vehicleSql = "SELECT * FROM vehicles WHERE id = ?";
  const maintenanceSql = "SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY maintenance_date DESC LIMIT 5";
  const repairSql = "SELECT * FROM repair_history WHERE vehicle_id = ? ORDER BY repair_date DESC LIMIT 5";
  
  db.query(vehicleSql, [req.params.vehicleId], (err, vehicleResult) => {
    if (err) {
      console.error("Error fetching vehicle:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (vehicleResult.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    
    db.query(maintenanceSql, [req.params.vehicleId], (err, maintenanceResult) => {
      db.query(repairSql, [req.params.vehicleId], (err, repairResult) => {
        res.json({
          vehicle: vehicleResult[0],
          maintenance_records: maintenanceResult || [],
          repair_history: repairResult || [],
          total_maintenance_cost: maintenanceResult.reduce((sum, m) => sum + Number(m.cost), 0),
          total_repair_cost: repairResult.reduce((sum, r) => sum + Number(r.total_cost), 0)
        });
      });
    });
  });
});

// UPDATE vehicle specifications
router.put("/:vehicleId/specs", (req, res) => {
  const { engine_size, transmission, fuel_type, color, mileage, condition, previous_owners, registration_number } = req.body;
  
  const sql = `
    UPDATE vehicles 
    SET engine_size = ?, transmission = ?, fuel_type = ?, color = ?, 
        mileage = ?, condition = ?, previous_owners = ?, registration_number = ?
    WHERE id = ?
  `;
  
  db.query(sql, [engine_size, transmission, fuel_type, color, mileage, condition, previous_owners, registration_number, req.params.vehicleId], (err, result) => {
    if (err) {
      console.error("Error updating vehicle specs:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Vehicle specifications updated" });
  });
});

module.exports = router;
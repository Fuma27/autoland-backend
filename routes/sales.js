const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all sales with customer details
router.get("/", (req, res) => {
  const sql = `
    SELECT s.*, 
           c.first_name, c.last_name, c.id_number, c.email, c.phone, c.address, c.city,
           v.quantity as current_stock, v.make, v.model, v.vehicle_name
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id 
    ORDER BY s.sale_date DESC
  `;
  
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result || []);
  });
});

// GET single sale with full details
router.get("/:id", (req, res) => {
  const sql = `
    SELECT s.*, 
           c.first_name, c.last_name, c.id_number, c.email, c.phone, c.address, c.city,
           v.vehicle_name, v.make, v.model, v.year, v.selling_price
    FROM sales s 
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id 
    WHERE s.id = ?
  `;
  
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0]);
  });
});

// ADD new sale with customer
router.post("/", (req, res) => {
  const { 
    vehicle_id, customer_id, customer_name, quantity_sold, 
    payment_method, amount_paid, installment_months,
    // Customer details (if new customer)
    first_name, last_name, id_number, email, phone, alternative_phone, address, city, postal_code
  } = req.body;
  
  console.log("Sale request:", { vehicle_id, customer_id, customer_name, quantity_sold });
  
  // Start by handling customer
  const processCustomer = (callback) => {
    if (customer_id) {
      // Use existing customer
      callback(null, customer_id);
    } else if (first_name && last_name && phone) {
      // Create new customer
      const sql = `
        INSERT INTO customers 
        (first_name, last_name, id_number, email, phone, alternative_phone, address, city, postal_code) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sql, [first_name, last_name, id_number, email, phone, alternative_phone, address, city, postal_code], (err, result) => {
        if (err) return callback(err);
        callback(null, result.insertId);
      });
    } else {
      callback(new Error("Customer information required"));
    }
  };
  
  processCustomer(async (err, finalCustomerId) => {
    if (err) return res.status(400).json({ error: err.message });
    
    // Get vehicle details
    db.query("SELECT * FROM vehicles WHERE id = ?", [vehicle_id], (err, vehicles) => {
      if (err) return res.status(500).json({ error: err.message });
      if (vehicles.length === 0) return res.status(404).json({ error: "Vehicle not found" });
      
      const vehicle = vehicles[0];
      const currentStock = vehicle.quantity;
      
      if (currentStock < quantity_sold) {
        return res.status(400).json({ error: `Only ${currentStock} unit(s) available` });
      }
      
      const totalAmount = vehicle.selling_price * quantity_sold;
      const vehicleName = vehicle.vehicle_name || `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
      const newStock = currentStock - quantity_sold;
      const balanceDue = totalAmount - amount_paid;
      
      let paymentStatus = 'Paid';
      if (amount_paid === 0) paymentStatus = 'Pending';
      else if (amount_paid < totalAmount) paymentStatus = 'Partial';
      
      // Update inventory
      db.query("UPDATE vehicles SET quantity = ? WHERE id = ?", [newStock, vehicle_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (newStock === 0) {
          db.query("UPDATE vehicles SET status = 'sold' WHERE id = ?", [vehicle_id]);
        }
        
        // Insert sale
        const saleSql = `
          INSERT INTO sales 
          (vehicle_id, vehicle_name, customer, customer_id, amount, quantity_sold, 
           payment_method, amount_paid, payment_status, installment_months) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const customerName = customer_name || `${first_name} ${last_name}`;
        
        db.query(saleSql, [
          vehicle_id, vehicleName, customerName, finalCustomerId, totalAmount, quantity_sold,
          payment_method, amount_paid, paymentStatus, 
          payment_method === 'Installment' ? (installment_months || null) : null
        ], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({ 
            success: true,
            message: "Sale completed successfully",
            sale_id: result.insertId,
            customer_id: finalCustomerId,
            total_amount: totalAmount,
            amount_paid: amount_paid,
            balance_due: balanceDue,
            payment_status: paymentStatus,
            stock_remaining: newStock
          });
        });
      });
    });
  });
});

// GET sales summary with customer analytics
router.get("/summary/analytics", (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_sales,
      SUM(amount) as total_revenue,
      SUM(amount_paid) as total_received,
      SUM(amount - amount_paid) as total_outstanding,
      COUNT(DISTINCT customer_id) as unique_customers,
      COUNT(CASE WHEN payment_method = 'Cash' THEN 1 END) as cash_sales,
      COUNT(CASE WHEN payment_method = 'Bank' THEN 1 END) as bank_sales,
      COUNT(CASE WHEN payment_method = 'Installment' THEN 1 END) as installment_sales,
      SUM(CASE WHEN payment_status = 'Paid' THEN amount ELSE 0 END) as paid_revenue
    FROM sales
  `;
  
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0]);
  });
});

module.exports = router;
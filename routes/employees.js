const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all employees
router.get("/", (req, res) => {
  const sql = "SELECT * FROM employees ORDER BY created_at DESC";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching employees:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result || []);
  });
});

// GET single employee
router.get("/:id", (req, res) => {
  db.query("SELECT * FROM employees WHERE id = ?", [req.params.id], (err, result) => {
    if (err) {
      console.error("Error fetching employee:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result[0] || null);
  });
});

// GET employee with salary history
router.get("/:id/complete", (req, res) => {
  const employeeSql = "SELECT * FROM employees WHERE id = ?";
  const salarySql = "SELECT * FROM salary_payments WHERE employee_id = ? ORDER BY payment_date DESC LIMIT 6";
  
  db.query(employeeSql, [req.params.id], (err, employeeResult) => {
    if (err) {
      console.error("Error fetching employee:", err);
      return res.status(500).json({ error: err.message });
    }
    if (employeeResult.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    db.query(salarySql, [req.params.id], (err, salaryResult) => {
      if (err) {
        console.error("Error fetching salary:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({
        employee: employeeResult[0],
        salary_history: salaryResult || [],
        attendance_records: []
      });
    });
  });
});

// ADD employee
router.post("/", (req, res) => {
  console.log("Received employee data:", req.body);
  
  const {
    employee_number, first_name, last_name, id_number, email, phone,
    alternative_phone, address, city, position, department, hire_date,
    employment_type, basic_salary, bank_name, bank_account_number,
    emergency_contact_name, emergency_contact_phone, status, notes
  } = req.body;
  
  // Validate required fields
  if (!employee_number || !first_name || !last_name || !id_number || !phone || !position || !department || !hire_date || !basic_salary) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const sql = `
    INSERT INTO employees (
      employee_number, first_name, last_name, id_number, email, phone,
      alternative_phone, address, city, position, department, hire_date,
      employment_type, basic_salary, bank_name, bank_account_number,
      emergency_contact_name, emergency_contact_phone, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    employee_number, first_name, last_name, id_number, email || null, phone,
    alternative_phone || null, address || null, city || null, position, department, hire_date,
    employment_type || 'Full-time', basic_salary, bank_name || null, bank_account_number || null,
    emergency_contact_name || null, emergency_contact_phone || null, status || 'Active', notes || null
  ];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error adding employee:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Employee added", id: result.insertId });
  });
});

// UPDATE employee
router.put("/:id", (req, res) => {
  const {
    employee_number, first_name, last_name, id_number, email, phone,
    alternative_phone, address, city, position, department, hire_date,
    employment_type, basic_salary, bank_name, bank_account_number,
    emergency_contact_name, emergency_contact_phone, status, notes
  } = req.body;
  
  const sql = `
    UPDATE employees SET
      employee_number = ?, first_name = ?, last_name = ?, id_number = ?, email = ?, phone = ?,
      alternative_phone = ?, address = ?, city = ?, position = ?, department = ?, hire_date = ?,
      employment_type = ?, basic_salary = ?, bank_name = ?, bank_account_number = ?,
      emergency_contact_name = ?, emergency_contact_phone = ?, status = ?, notes = ?
    WHERE id = ?
  `;
  
  db.query(sql, [
    employee_number, first_name, last_name, id_number, email, phone,
    alternative_phone, address, city, position, department, hire_date,
    employment_type, basic_salary, bank_name, bank_account_number,
    emergency_contact_name, emergency_contact_phone, status, notes, req.params.id
  ], (err, result) => {
    if (err) {
      console.error("Error updating employee:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Employee updated" });
  });
});

// DELETE employee
router.delete("/:id", (req, res) => {
  db.query("DELETE FROM employees WHERE id = ?", [req.params.id], (err, result) => {
    if (err) {
      console.error("Error deleting employee:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Employee deleted" });
  });
});

// RECORD salary payment
router.post("/:id/salary", (req, res) => {
  const { payment_date, payment_month, overtime_hours, overtime_rate, bonus, allowances, deductions, tax_amount, payment_method, transaction_reference, notes } = req.body;
  
  db.query("SELECT basic_salary FROM employees WHERE id = ?", [req.params.id], (err, employee) => {
    if (err) {
      console.error("Error fetching employee:", err);
      return res.status(500).json({ error: err.message });
    }
    if (employee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    const basic_salary = employee[0].basic_salary;
    
    const sql = `
      INSERT INTO salary_payments (
        employee_id, payment_date, payment_month, basic_salary, overtime_hours, overtime_rate,
        bonus, allowances, deductions, tax_amount, payment_method, transaction_reference, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [
      req.params.id, payment_date, payment_month, basic_salary, overtime_hours || 0, overtime_rate || 0,
      bonus || 0, allowances || 0, deductions || 0, tax_amount || 0, payment_method, transaction_reference, notes
    ], (err, result) => {
      if (err) {
        console.error("Error recording salary:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Salary payment recorded", id: result.insertId });
    });
  });
});

// GET salary summary
router.get("/summary/salary", (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_employees,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_employees,
      SUM(CASE WHEN status = 'Active' THEN basic_salary ELSE 0 END) as monthly_salary_bill,
      AVG(basic_salary) as average_salary,
      SUM(CASE WHEN department = 'Sales' THEN basic_salary ELSE 0 END) as sales_department_cost,
      SUM(CASE WHEN department = 'Service' THEN basic_salary ELSE 0 END) as service_department_cost,
      SUM(CASE WHEN department = 'Finance' THEN basic_salary ELSE 0 END) as finance_department_cost
    FROM employees
  `;
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching salary summary:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result[0]);
  });
});

module.exports = router;
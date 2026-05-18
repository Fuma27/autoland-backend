require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Existing routes
const salesRoutes = require("./routes/sales");
app.use("/api/sales", salesRoutes);

const expenseRoutes = require("./routes/expenses");
app.use("/api/expenses", expenseRoutes);

const vehicleRoutes = require("./routes/vehicles");
app.use("/api/vehicles", vehicleRoutes);

const customerRoutes = require("./routes/customers");
app.use("/api/customers", customerRoutes);

const vehicleDetailsRoutes = require("./routes/vehicleDetails");
app.use("/api/vehicle-details", vehicleDetailsRoutes);

// ADD THIS - Employee routes
const employeeRoutes = require("./routes/employees");
app.use("/api/employees", employeeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
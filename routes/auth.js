const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "autoland_fallback_secret_key_123";

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  try {
    // Check if user already exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ message: "Server error checking user" });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert user
      db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hashedPassword],
        (insertErr, insertResults) => {
          if (insertErr) {
            console.error("Database insert error:", insertErr);
            return res.status(500).json({ message: "Server error registering user" });
          }

          // Create JWT
          const payload = {
            user: {
              id: insertResults.insertId,
              name,
              email
            }
          };

          jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: "7d" },
            (tokenErr, token) => {
              if (tokenErr) throw tokenErr;
              res.json({
                token,
                user: {
                  id: insertResults.insertId,
                  name,
                  email
                }
              });
            }
          );
        }
      );
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  try {
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ message: "Server error" });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const user = results[0];

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create JWT
      const payload = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };

      jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: "7d" },
        (tokenErr, token) => {
          if (tokenErr) throw tokenErr;
          res.json({
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email
            }
          });
        }
      );
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET api/auth/me
// @desc    Get user data by token
// @access  Private (client-side route checking helper)
router.get("/me", (req, res) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json(decoded.user);
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
});

module.exports = router;

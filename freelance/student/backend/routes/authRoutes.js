// backend/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid"); // ✅ NEW
const db = require("../db");

const router = express.Router();

// ---------------- HELPERS ----------------

// Get user by email
function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Create user WITH login_id
function createUser({ loginId, name, email, passwordHash, role, collegeName, skills }) {
  return new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();

    db.run(
      `INSERT INTO users 
       (login_id, name, email, password_hash, role, college_name, skills, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loginId,
        name,
        email,
        passwordHash,
        role,
        collegeName || null,
        skills || null,
        createdAt,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

// Update last login
function updateLastLogin(userId) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      `UPDATE users SET last_login_at = ? WHERE id = ?`,
      [now, userId],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// ---------------- ROUTES ----------------

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, collegeName, skills } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["student", "organization"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ Generate UNIQUE login ID
    const loginId = uuidv4();

    const userId = await createUser({
      loginId,
      name,
      email,
      passwordHash,
      role,
      collegeName: role === "student" ? collegeName : null,
      skills: role === "student" ? skills : null,
    });

    return res.json({
      message: "Account created successfully",
      userId,
      login_id: loginId, // optional return
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    await updateLastLogin(user.id);

    // ✅ RETURN login_id (CRITICAL)
    return res.json({
      message: "Login successful",
      login_id: user.login_id,
      role: user.role,
      name: user.name,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});




router.get("/me", (req, res) => {
  const login_id =
    req.headers["x-login-id"] ||
    req.cookies?.login_id ||
    req.query.login_id;

  if (!login_id) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  db.get(
    "SELECT id, name, email, role, login_id FROM users WHERE login_id = ?",
    [login_id],
    (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false });
      }

      if (!user) {
        return res.status(401).json({ success: false });
      }

      res.json(user); // 🔴 THIS WAS LIKELY MISSING
    }
  );
});


module.exports = router;

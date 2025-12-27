
// backend/server.js
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

// ---- Middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger (helpful while developing)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} -> ${req.method} ${req.originalUrl}`);
  next();
});

// ---- Paths (project root is two levels up from backend) ----
const ROOT_DIR = path.join(__dirname, "..", "..");   // ...\freelance project
const STUDENT_DIR = path.join(ROOT_DIR, "student");
const ADMIN_DIR = path.join(ROOT_DIR, "admin");
const ORG_DIR = path.join(ROOT_DIR, "organization");

// ---- Static files ----
app.use(express.static(ROOT_DIR));
app.use("/student", express.static(STUDENT_DIR));
app.use("/admin", express.static(ADMIN_DIR));
app.use("/organization", express.static(ORG_DIR));

// ---- Routes: auth / api ----
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// Student APIs (studentRoutes exports an express Router)
const studentRoutes = require("./routes/studentRoutes");
app.use("/student", studentRoutes); // e.g. /student/report, /student/gig-guide, /student/trial-projects ...

// Organization APIs (organizationRoutes exports an express Router)
const organizationRoutes = require("./routes/organizationRoutes");
app.use("/organization", organizationRoutes);
app.use("/org", organizationRoutes);

//adminroutes
  const adminRoutes = require("./routes/adminRoutes");
app.use("/admin", adminRoutes);

// app.use("/org", organizationRoutes); // e.g. /org/projects, /org/projects/:id, /org/projects/create ...
// const organizationRoutes = require("./routes/organizationRoutes");

// ---- Dev helper: debug route (local only) ----
// NOTE: This is intentionally verbose to help debug "project details not showing".
// Remove or protect this route in production.
const db = require("./db");
app.get("/org/debug/projects/:id/raw", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "Invalid project id" });
  // return project, milestones, applications, assignments raw rows
  const out = {};
  db.get("SELECT * FROM org_projects WHERE id = ?", [id], (err, project) => {
    if (err) {
      console.error("debug: project select err", err);
      return res.status(500).json({ success: false, error: "DB error (project)", detail: err.message });
    }
    out.project = project || null;

    db.all("SELECT * FROM org_project_milestones WHERE project_id = ? ORDER BY id ASC", [id], (err2, milestones) => {
      if (err2) {
        console.warn("debug: milestones select err", err2);
        out.milestones = [];
      } else {
        out.milestones = milestones;
      }

      db.all("SELECT * FROM project_applications WHERE project_id = ? ORDER BY applied_at DESC", [id], (err3, apps) => {
        if (err3) {
          console.warn("debug: applications select err (maybe table missing)", err3);
          out.applications = [];
        } else {
          out.applications = apps;
        }

        db.all("SELECT * FROM project_assignments WHERE project_id = ? ORDER BY id DESC", [id], (err4, assigns) => {
          if (err4) {
            console.warn("debug: assignments select err", err4);
            out.assignments = [];
          } else {
            out.assignments = assigns;
          }

          return res.json({ success: true, debug: out });
        });
      });
    });
  });
});

// ---- Root redirect ----
app.get("/", (req, res) => {
  // change this if you want another default
  res.redirect("/student/login.html");
});

// ---- Generic error handler (catches synchronous errors thrown from middleware/routes) ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, error: "Internal server error", detail: err.message });
});

// ---- Start server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

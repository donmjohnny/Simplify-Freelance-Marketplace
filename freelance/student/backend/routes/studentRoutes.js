
// backend/routes/studentRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ======================================================
   GET STUDENT PROFILE
====================================================== */
router.get("/profile", (req, res) => {
  const login_id = req.get("x-login-id");
  if (!login_id) return res.json({ success: false });

  db.get(
    `
    SELECT 
      name,
      email,
      college_name,
      skills
    FROM users
    WHERE login_id = ? AND role = 'student'
    `,
    [login_id],
    (err, row) => {
      if (err || !row) return res.json({ success: false });
      res.json(row);
    }
  );
});

/* ======================================================
   GET ALL ORGANIZATION PROJECTS (FOR STUDENTS)
====================================================== */
router.get("/projects", (req, res) => {
  const sql = `
    SELECT 
      p.id AS project_id,
      p.project_name,
      p.deadline,
      p.total_value,
      u.name AS org_name
    FROM org_projects p
    JOIN users u ON u.id = p.org_id
    ORDER BY p.created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Projects fetch error:", err);
      return res.json({ success: false });
    }

    db.all(
      `SELECT project_id, title, price FROM org_project_milestones`,
      [],
      (err2, milestones) => {
        if (err2) {
          console.error("Milestones fetch error:", err2);
          return res.json({ success: false });
        }

        const map = {};
        milestones.forEach(m => {
          if (!map[m.project_id]) map[m.project_id] = [];
          map[m.project_id].push(m);
        });

        res.json({
          success: true,
          projects: rows.map(p => ({
            ...p,
            milestones: map[p.project_id] || []
          }))
        });
      }
    );
  });
});

/* ======================================================
   GET MILESTONES FOR A PROJECT
====================================================== */


/* ======================================================
   APPLY TO PROJECT
====================================================== */
router.post("/projects/apply", (req, res) => {
  const { login_id, project_id } = req.body;

  if (!login_id || !project_id) {
    return res.json({ success: false, error: "Missing data" });
  }

  // 1️⃣ Find student
  db.get(
    "SELECT id FROM users WHERE login_id = ? AND role = 'student'",
    [login_id],
    (err, student) => {
      if (err || !student) {
        return res.json({ success: false, error: "Student not found" });
      }

      // 2️⃣ Prevent duplicate application
      db.get(
        `SELECT id FROM project_applications 
         WHERE project_id = ? AND student_id = ?`,
        [project_id, student.id],
        (err2, exists) => {
          if (exists) {
            return res.json({ success: false, error: "Already applied" });
          }

          // 3️⃣ Insert application (NO org_id)
          db.run(
            `INSERT INTO project_applications
             (project_id, student_id, applied_at)
             VALUES (?, ?, ?)`,
            [project_id, student.id, new Date().toISOString()],
            (err3) => {
              if (err3) {
                console.error("Apply error:", err3);
                return res.json({ success: false });
              }

              res.json({ success: true });
            }
          );
        }
      );
    }
  );
});

// GET accepted projects for logged-in student
router.get("/active-projects", (req, res) => {
  const login_id = req.get("x-login-id");
  if (!login_id) return res.json({ success: false });

  // 1️⃣ Get student ID
  db.get(
    `SELECT id FROM users WHERE login_id = ? AND role = 'student'`,
    [login_id],
    (err, student) => {
      if (err || !student) {
        console.error("Student not found");
        return res.json({ success: false });
      }

      // 2️⃣ Fetch assigned projects (NO status filter yet)
      db.all(
        `
        SELECT 
          a.id AS assignment_id,
          p.project_name,
          u.name AS org_name
        FROM project_assignments a
        JOIN org_projects p ON p.id = a.project_id
        JOIN users u ON u.id = p.org_id
        WHERE a.student_id = ?
        `,
        [student.id],
        (err2, rows) => {
          if (err2) {
            console.error("Active projects error:", err2);
            return res.json({ success: false });
          }

          res.json({ success: true, projects: rows });
        }
      );
    }
  );
});

router.get("/projects/:assignmentId/milestones", (req, res) => {
  const assignmentId = Number(req.params.assignmentId);

  db.get(
    `SELECT project_id FROM project_assignments WHERE id = ?`,
    [assignmentId],
    (err, assignment) => {
      if (err || !assignment) {
        return res.json({ success: false });
      }

      db.all(
        `
        SELECT 
          m.id AS milestone_id,   -- 🔴 THIS WAS MISSING
          m.title,
          m.price,
          s.submission_url,
          s.status
        FROM org_project_milestones m
        LEFT JOIN milestone_submissions s
          ON s.milestone_id = m.id
         AND s.assignment_id = ?
        WHERE m.project_id = ?
        ORDER BY m.id
        `,
        [assignmentId, assignment.project_id],
        (err2, rows) => {
          if (err2) return res.json({ success: false });
          res.json({ success: true, milestones: rows });
        }
      );
    }
  );
});

// POST submit milestone work
router.post("/milestones/:id/submit", (req, res) => {
  const milestoneId = Number(req.params.id);
  const { assignment_id, submission_url } = req.body;

  if (!milestoneId || !assignment_id || !submission_url) {
    console.error("Invalid submit payload", {
      milestoneId,
      assignment_id,
      submission_url
    });
    return res.json({ success: false, error: "Invalid data" });
  }

  db.run(
    `
    INSERT INTO milestone_submissions
      (milestone_id, assignment_id, submission_url, status)
    VALUES (?, ?, ?, 'submitted')
    `,
    [milestoneId, assignment_id, submission_url],
    function (err) {
      if (err) {
        console.error("INSERT FAILED:", err.message);
        return res.json({ success: false, error: err.message });
      }

      console.log("SUBMISSION INSERTED:", this.lastID);
      res.json({ success: true });
    }
  );
});

// above are related to the freeelance section 



/* ======================================================
   GET WEB DEVELOPMENT COURSES
====================================================== */
router.get("/webdev-courses", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      short_description,
      organization,
      level,
      duration,
      external_url
    FROM courses
    WHERE category = 'webdev'
      AND is_active = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Webdev courses error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        courses: rows
      });
    }
  );
});

/* ======================================================
   GET CYBER SECURITY COURSES
====================================================== */
router.get("/cyber-courses", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      short_description,
      organization,
      level,
      duration,
      external_url
    FROM courses
    WHERE category = 'cyber'
      AND is_active = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Cyber courses error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        courses: rows
      });
    }
  );
});


/* ======================================================
   GET DATA ANALYTICS COURSES
====================================================== */
router.get("/data-analytics-courses", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      short_description,
      organization,
      level,
      duration,
      external_url
    FROM courses
    WHERE category = 'data-analytics'
      AND is_active = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Data analytics courses error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        courses: rows
      });
    }
  );
});
/* ======================================================
   GET DATA SCIENCE COURSES
====================================================== */
router.get("/data-science-courses", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      short_description,
      organization,
      level,
      duration,
      external_url
    FROM courses
    WHERE category = 'data-science'
      AND is_active = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Data science courses error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        courses: rows
      });
    }
  );
});

/* ======================================================
   GET AI / ML COURSES
====================================================== */
router.get("/aiml-courses", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      short_description,
      organization,
      level,
      duration,
      external_url
    FROM courses
    WHERE category = 'ai-ml'
      AND is_active = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("AI/ML courses error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        courses: rows
      });
    }
  );
});

/* ======================================================
   GET SOFTWARE DEVELOPMENT COURSES
====================================================== */
router.get("/softwaredev-courses", (req, res) => {
  db.all(
    `
    SELECT *
    FROM courses
    WHERE LOWER(category) LIKE '%software%'
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, error: "DB error" });
      }

      res.json({
        success: true,
        courses: rows
      });
    }
  );
});



/* ======================================================
   GET GIG GUIDE BOOKS (NOTES)
====================================================== */
router.get("/gig-guide", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      topic,
      link
    FROM gig_books
    ORDER BY title ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Gig guide fetch error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        books: rows
      });
    }
  );
});

/* ======================================================
   GET TRIAL PROJECTS (FOR STUDENTS)
====================================================== */
router.get("/trial-projects", (req, res) => {
  db.all(
    `
    SELECT 
      title,
      short_description,
      domain,
      skills_required,
      difficulty,
      estimated_hours,
      budget_range
    FROM projects
    WHERE is_trial = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error("Trial projects fetch error:", err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        projects: rows
      });
    }
  );
});



const { sendStudentReport } = require("../reportMail");

router.post("/report", (req, res) => {
  const { name, email, category, description } = req.body;

  if (!name || !email || !category || !description) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // ✅ Respond to frontend immediately
  res.status(200).json({
    success: true,
    message: "✅ Report submitted successfully."
  });

  // 🔥 Send mail in background (NON-BLOCKING)
  sendStudentReport({ name, email, category, description })
    .then(() => console.log("📨 Report mail sent"))
    .catch(err => console.error("❌ Mail failed:", err.message));
});


/* ======================================================
   GET PROJECT MILESTONES (STUDENT – BEFORE APPLY)
   GET /student/project/:projectId/milestones
====================================================== */
router.get("/project/:projectId/milestones", (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!projectId) {
    return res.json({ success: false, milestones: [] });
  }

  db.all(
    `
    SELECT 
      id AS milestone_id,
      title,
      price
    FROM org_project_milestones
    WHERE project_id = ?
    ORDER BY id ASC
    `,
    [projectId],
    (err, rows) => {
      if (err) {
        console.error("Project milestone fetch error:", err);
        return res.json({ success: false, milestones: [] });
      }

      res.json({ success: true, milestones: rows });
    }
  );
});


module.exports = router;







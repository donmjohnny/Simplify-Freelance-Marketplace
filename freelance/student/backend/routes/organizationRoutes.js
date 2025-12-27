
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ======================================================
   HELPER: Resolve organization from login_id
====================================================== */
function getOrgFromLoginId(login_id) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id, role FROM users WHERE login_id = ?",
      [login_id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

/* ======================================================
   POST /org/projects/create
====================================================== */
router.post("/projects/create", async (req, res) => {
  try {
    const { login_id, project_name, deadline, milestones } = req.body;

    if (!login_id || !project_name || !Array.isArray(milestones) || milestones.length === 0) {
      return res.json({ success: false, error: "Invalid input" });
    }

    const org = await getOrgFromLoginId(login_id);
    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    const total_value = milestones.reduce((s, m) => s + Number(m.price || 0), 0);
    const created_at = new Date().toISOString();

    db.run(
      `INSERT INTO org_projects (org_id, project_name, deadline, total_value, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [org.id, project_name, deadline || null, total_value, created_at],
      function (err) {
        if (err) return res.json({ success: false });

        const project_id = this.lastID;
        const stmt = db.prepare(`
          INSERT INTO org_project_milestones
          (project_id, title, description, price, due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        milestones.forEach(m => {
          stmt.run(
            project_id,
            m.title,
            m.description || "",
            Number(m.price || 0),
            m.due_date || null,
            created_at
          );
        });

        stmt.finalize();
        res.json({ success: true });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   GET /org/projects  (ONLY THIS ORG)
====================================================== */
router.get("/projects", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    if (!login_id) return res.json({ success: false });

    const org = await getOrgFromLoginId(login_id);
    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.all(
      `
      SELECT id, project_name, deadline, total_value
      FROM org_projects
      WHERE org_id = ?
      ORDER BY created_at DESC
      `,
      [org.id],
      (err, rows) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, projects: rows });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   GET /org/projects/:id  (PROJECT + APPLICANTS)
====================================================== */
router.get("/projects/:id", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const projectId = parseInt(req.params.id);

    if (!login_id || !projectId) return res.json({ success: false });

    const org = await getOrgFromLoginId(login_id);
    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.get(
      `SELECT * FROM org_projects WHERE id = ? AND org_id = ?`,
      [projectId, org.id],
      (err, project) => {
        if (err || !project) return res.json({ success: false });

        db.all(
          `
          SELECT 
            u.id AS student_id,
            u.name,
            u.email
          FROM project_applications pa
          JOIN users u ON u.id = pa.student_id
          WHERE pa.project_id = ?
          `,
          [projectId],
          (err2, applicants) => {
            if (err2) return res.json({ success: false });

            res.json({
              success: true,
              project,
              applicants
            });
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});
/* ======================================================
   GET /org/projects/:id/applicants
====================================================== */
router.get("/projects/:id/applicants", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const projectId = parseInt(req.params.id);

    const org = await getOrgFromLoginId(login_id);
    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.all(
      `
      SELECT 
        pa.student_id,
        u.name,
        u.email,
        pa.applied_at
      FROM project_applications pa
      JOIN users u ON u.id = pa.student_id
      WHERE pa.project_id = ?
      `,
      [projectId],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.json({ success: false });
        }
        res.json({ success: true, applicants: rows });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   POST /org/projects/:id/assign
====================================================== */
router.post("/projects/:id/assign", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const projectId = parseInt(req.params.id);
    const { student_id } = req.body;

    if (!login_id || !student_id) return res.json({ success: false });

    const org = await getOrgFromLoginId(login_id);
    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    const assigned_at = new Date().toISOString();

    db.run(
      `
      INSERT INTO project_assignments
      (project_id, student_id, assigned_by_org, assigned_at, status)
      VALUES (?, ?, ?, ?, 'active')
      `,
      [projectId, student_id, org.id, assigned_at],
      function (err) {
        if (err) {
          console.error(err);
          return res.json({ success: false });
        }

        // remove from applicants
        db.run(
          `DELETE FROM project_applications
           WHERE project_id = ? AND student_id = ?`,
          [projectId, student_id]
        );

        res.json({ success: true });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   GET /org/active-work
====================================================== */
router.get("/active-work", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    if (!login_id) return res.json({ success: false });

    const org = await getOrgFromLoginId(login_id);
    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.all(
      `
      SELECT 
        p.project_name,
        u.name,
        u.email,
        a.assigned_at
      FROM project_assignments a
      JOIN org_projects p ON p.id = a.project_id
      JOIN users u ON u.id = a.student_id
      WHERE a.assigned_by_org = ? AND a.status = 'active'
      `,
      [org.id],
      (err, rows) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, active: rows });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});
/* ======================================================
   POST /org/projects/:id/accept
====================================================== */
router.post("/projects/:id/accept", async (req, res) => {
  const login_id = req.get("x-login-id");
  const projectId = parseInt(req.params.id);
  const { student_id } = req.body;

  const org = await getOrgFromLoginId(login_id);
  if (!org) return res.json({ success: false });

  db.run(
    `INSERT INTO project_assignments
     (project_id, student_id, assigned_by_org, assigned_at, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [projectId, student_id, org.id, new Date().toISOString()],
    (err) => {
      if (err) return res.json({ success: false });

      db.run(
        `DELETE FROM project_applications 
         WHERE project_id = ? AND student_id = ?`,
        [projectId, student_id]
      );

      res.json({ success: true });
    }
  );
});
/* ======================================================
   GET /org/active-work/details
====================================================== */
router.get("/active-work/details", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const org = await getOrgFromLoginId(login_id);

    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.all(
      `
      SELECT 
        a.id AS assignment_id,
        p.project_name,
        u.name AS student_name,
        u.email AS student_email,
        m.id AS milestone_id,
        m.title AS milestone_title,
        m.price,
        s.submission_url,
        s.status
      FROM project_assignments a
      JOIN org_projects p ON p.id = a.project_id
      JOIN users u ON u.id = a.student_id
      JOIN org_project_milestones m ON m.project_id = p.id
      LEFT JOIN milestone_submissions s
        ON s.milestone_id = m.id AND s.assignment_id = a.id
      WHERE a.assigned_by_org = ?
        AND a.status = 'active'
      ORDER BY p.id, m.id
      `,
      [org.id],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.json({ success: false });
        }

        res.json({ success: true, work: rows });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   POST /org/milestones/:id/accept
====================================================== */
router.post("/milestones/:id/accept", (req, res) => {
  const milestoneId = req.params.id;

  db.run(
    `UPDATE milestone_submissions
     SET status = 'accepted'
     WHERE milestone_id = ?`,
    [milestoneId],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

router.post("/milestones/:id/decline", (req, res) => {
  const milestoneId = req.params.id;

  db.run(
    `UPDATE milestone_submissions
     SET status = 'declined'
     WHERE milestone_id = ?`,
    [milestoneId],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

/* ======================================================
   GET /org/profile
====================================================== */
router.get("/profile", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const org = await getOrgFromLoginId(login_id);

    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.get(
      `
      SELECT name, email, created_at
      FROM users
      WHERE id = ?
      `,
      [org.id],
      (err, row) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, org: row });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   GET /org/profile/projects
====================================================== */
router.get("/profile/projects", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const org = await getOrgFromLoginId(login_id);

    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.all(
      `
      SELECT id, project_name, deadline, total_value
      FROM org_projects
      WHERE org_id = ?
      ORDER BY created_at DESC
      `,
      [org.id],
      (err, projects) => {
        if (err) return res.json({ success: false });

        db.all(
          `SELECT * FROM org_project_milestones`,
          [],
          (err2, milestones) => {
            if (err2) return res.json({ success: false });

            const grouped = {};
            milestones.forEach(m => {
              if (!grouped[m.project_id]) grouped[m.project_id] = [];
              grouped[m.project_id].push(m);
            });

            const result = projects.map(p => ({
              ...p,
              milestones: grouped[p.id] || []
            }));

            res.json({ success: true, projects: result });
          }
        );
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   DELETE /org/projects/:id
====================================================== */
router.delete("/projects/:id", async (req, res) => {
  try {
    const login_id = req.get("x-login-id");
    const projectId = parseInt(req.params.id);
    const org = await getOrgFromLoginId(login_id);

    if (!org || org.role !== "organization") {
      return res.status(403).json({ success: false });
    }

    db.serialize(() => {
      db.run(`DELETE FROM milestone_submissions WHERE milestone_id IN (
        SELECT id FROM org_project_milestones WHERE project_id = ?
      )`, [projectId]);

      db.run(`DELETE FROM project_assignments WHERE project_id = ?`, [projectId]);
      db.run(`DELETE FROM project_applications WHERE project_id = ?`, [projectId]);
      db.run(`DELETE FROM org_project_milestones WHERE project_id = ?`, [projectId]);
      db.run(`DELETE FROM org_projects WHERE id = ? AND org_id = ?`, [projectId, org.id]);

      res.json({ success: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});


const { sendStudentReport } = require("../reportMail");

// POST /organization/report
router.post("/report", async (req, res) => {
  try {
    const { name, email, category, description } = req.body;

    if (!name || !email || !category || !description) {
      return res.status(400).json({ error: "All fields are required." });
    }

    await sendStudentReport({
      name,
      email,
      category: `ORG - ${category}`, // helps admin identify source
      description
    });

    res.json({ success: true, message: "Report sent successfully." });
  } catch (err) {
    console.error("Organization report error:", err);
    res.status(500).json({ error: "Failed to send report." });
  }
});

module.exports = router;

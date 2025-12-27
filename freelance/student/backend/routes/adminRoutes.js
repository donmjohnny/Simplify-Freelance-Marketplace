
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ===============================
   GET COURSES (by category)
   /admin/courses?category=webdev
================================ */
router.get("/courses", (req, res) => {
  const { category } = req.query;

  if (!category) {
    return res.json({ success: false, error: "Category required" });
  }

  db.all(
    `
    SELECT 
      id,
      title,
      short_description AS desc,
      organization AS org,
      duration,
      level
    FROM courses
    WHERE category = ?
    ORDER BY created_at DESC
    `,
    [category],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true, courses: rows });
    }
  );
});

/* ===============================
   ADD COURSE
   POST /admin/courses
================================ */
router.post("/courses", (req, res) => {
  const { title, description, organization, duration, level, category } = req.body;

  if (!title || !description || !organization || !duration || !level || !category) {
    return res.json({ success: false, error: "Missing fields" });
  }

  db.run(
    `
    INSERT INTO courses
    (code, title, short_description, category, organization, level, duration, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      "ADMIN_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      title,
      description,
      category,
      organization,
      level,
      duration,
      new Date().toISOString()
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

/* ===============================
   DELETE COURSE
   DELETE /admin/courses/:id
================================ */
router.delete("/courses/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.json({ success: false });

  db.run(
    `DELETE FROM courses WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

/* ===============================
   GET GIG BOOKS
   GET /admin/gig-books
================================ */
router.get("/gig-books", (req, res) => {
  db.all(
    `
    SELECT id, title, topic, provider, link
    FROM gig_books
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true, books: rows });
    }
  );
});

/* ===============================
   ADD GIG BOOK
   POST /admin/gig-books
================================ */
router.post("/gig-books", (req, res) => {
  const { title, topic, provider, link } = req.body;

  if (!title || !link) {
    return res.json({ success: false, error: "Missing fields" });
  }

  db.run(
    `
    INSERT INTO gig_books (title, topic, provider, link)
    VALUES (?, ?, ?, ?)
    `,
    [title, topic || null, provider || null, link],
    function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

/* ===============================
   DELETE GIG BOOK
   DELETE /admin/gig-books/:id
================================ */
router.delete("/gig-books/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.json({ success: false });

  db.run(
    `DELETE FROM gig_books WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});

/* ===============================
   GET TRIAL PROJECTS
   GET /admin/trial-projects
================================ */
router.get("/trial-projects", (req, res) => {
  db.all(
    `
    SELECT 
      id,
      title,
      short_description AS description,
      domain,
      skills_required,
      difficulty,
      estimated_hours
    FROM projects
    WHERE is_trial = 1
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true, projects: rows });
    }
  );
});

/* ===============================
   ADD TRIAL PROJECT
   POST /admin/trial-projects
================================ */
router.post("/trial-projects", (req, res) => {
  const {
    title,
    description,
    domain,
    skills,
    difficulty,
    estimated_hours
  } = req.body;

  if (!title || !description || !domain || !skills || !difficulty || !estimated_hours) {
    return res.json({ success: false, error: "Missing fields" });
  }

  db.run(
    `
    INSERT INTO projects
    (code, title, short_description, domain, skills_required, difficulty, estimated_hours, is_trial, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `,
    [
      "TRIAL_" + Date.now(),
      title,
      description,
      domain,
      skills,
      difficulty,
      estimated_hours,
      new Date().toISOString()
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

/* ===============================
   DELETE TRIAL PROJECT
   DELETE /admin/trial-projects/:id
================================ */
router.delete("/trial-projects/:id", (req, res) => {
  const id = Number(req.params.id);

  db.run(
    `DELETE FROM projects WHERE id = ? AND is_trial = 1`,
    [id],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    }
  );
});


module.exports = router;

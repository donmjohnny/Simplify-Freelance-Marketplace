// backend/db.js
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// DB file: backend/database.sqlite
const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath);

// ---------- TABLE CREATION ----------
db.serialize(() => {
  // USERS TABLE
  db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login_id TEXT NOT NULL UNIQUE,          -- ✅ NEW
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'organization', 'admin')),
    college_name TEXT,
    skills TEXT,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  )
`);


  // TRIAL PROJECTS TABLE
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL,
      domain TEXT,
      skills_required TEXT,
      difficulty TEXT,
      estimated_hours INTEGER,
      budget_range TEXT,
      is_trial INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // COURSES TABLE
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL,
      image_url TEXT,
      detail_path TEXT,
      category TEXT,
      organization TEXT,
      level TEXT,
      duration TEXT,
      external_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // GIG GUIDE BOOKS TABLE
  db.run(`
    CREATE TABLE IF NOT EXISTS gig_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      topic TEXT,
      provider TEXT,
      link TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ---------- ORGANIZATION PROJECTS (NEW) ----------
  // org_projects: header/table for organization-uploaded projects
  db.run(`
    CREATE TABLE IF NOT EXISTS org_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      project_name TEXT NOT NULL,
      deadline TEXT,
      total_value REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (org_id) REFERENCES users(id)
    )
  `);

  // org_project_milestones: milestones for each org project
  db.run(`
    CREATE TABLE IF NOT EXISTS org_project_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      due_date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES org_projects(id)
    )
  `);
  // ---------- STUDENT APPLICATIONS ----------
db.run(`
  CREATE TABLE IF NOT EXISTS project_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'applied',
    applied_at TEXT NOT NULL,
    updated_at TEXT,
    UNIQUE(project_id, student_id),
    FOREIGN KEY (project_id) REFERENCES org_projects(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  )
`);

// ---------- PROJECT ASSIGNMENTS ----------
db.run(`
  CREATE TABLE IF NOT EXISTS project_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    assigned_by_org INTEGER NOT NULL,
    assigned_at TEXT NOT NULL,
    role TEXT,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (project_id) REFERENCES org_projects(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (assigned_by_org) REFERENCES users(id)
  )
`);


  // project_attachments: optional table to track uploaded files (attachments)
  db.run(`
    CREATE TABLE IF NOT EXISTS project_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES org_projects(id) ON DELETE CASCADE
    )
  `);

  // ---- SEED DATA ----
  //insertTrialProjectsIfMissing(db);
  insertWebDevCoursesIfMissing(db);
  insertCyberCoursesIfMissing(db);
  insertDataAnalyticsCoursesIfMissing(db);
  insertDataScienceCoursesIfMissing(db);
  insertAIMLCoursesIfMissing(db);          // AI / ML
  insertSoftwareDevCoursesIfMissing(db);   // Software Development
  insertGigBooksIfMissing(db);             // Gig Guide
});

// ---------- SEED TRIAL PROJECTS ----------
function insertTrialProjectsIfMissing(db) {
  const now = new Date().toISOString();
  const trialProjects = [
    {
      code: "TRIAL_WEB_01",
      title: "Portfolio Website for Student Developer",
      short_description:
        "Build a responsive personal portfolio site with project gallery and contact form.",
      domain: "web-development",
      skills_required: "HTML, CSS, JavaScript, Responsive Design",
      difficulty: "Beginner",
      estimated_hours: 10,
      budget_range: "Unpaid trial",
    },
    {
      code: "TRIAL_AI_01",
      title: "Basic Spam Classifier for Emails",
      short_description:
        "Create a simple ML model that classifies emails as spam or not spam using sample data.",
      domain: "ai-ml",
      skills_required: "Python, Scikit-learn, Data Preprocessing",
      difficulty: "Intermediate",
      estimated_hours: 15,
      budget_range: "Unpaid trial",
    },
    {
      code: "TRIAL_DS_01",
      title: "Sales Dashboard with Data Visualization",
      short_description:
        "Build a dashboard showing monthly sales trends and KPIs using a CSV dataset.",
      domain: "data-science",
      skills_required:
        "Python, Pandas, Data Visualization, Excel/CSV handling",
      difficulty: "Intermediate",
      estimated_hours: 12,
      budget_range: "Unpaid trial",
    },
    {
      code: "TRIAL_CYBER_01",
      title: "Basic Vulnerability Assessment Report",
      short_description:
        "Perform a simple security check on a sample web app and prepare a structured report.",
      domain: "cybersecurity",
      skills_required: "OWASP basics, Report writing, Security tools (basic)",
      difficulty: "Intermediate",
      estimated_hours: 8,
      budget_range: "Unpaid trial",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO projects
    (code, title, short_description, domain, skills_required, difficulty, estimated_hours, budget_range, is_trial, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  trialProjects.forEach((p) => {
    stmt.run(
      p.code,
      p.title,
      p.short_description,
      p.domain,
      p.skills_required,
      p.difficulty,
      p.estimated_hours,
      p.budget_range,
      1,      // is_trial
      null,   // created_by
      now
    );
  });

  stmt.finalize();
}

// ---------- SEED WEB DEV COURSES ----------
function insertWebDevCoursesIfMissing(db) {
  const webDevCourses = [
    {
      code: "WEBDEV_IBM_FUNDAMENTALS",
      title: "Web Development Fundamentals",
      short_description:
        "Covers HTML, CSS, JavaScript, and basic frameworks for a solid foundation.",
      category: "webdev",
      organization: "IBM SkillBuild",
      level: "Intermediate",
      duration: "6–8 weeks",
      external_url: "#",
    },
    {
      code: "WEBDEV_FCC_RESPONSIVE",
      title: "Responsive Web Design",
      short_description:
        "Learn HTML, CSS, Flexbox, Grid, and Accessibility to build mobile-first websites.",
      category: "webdev",
      organization: "freeCodeCamp",
      level: "Beginner",
      duration: "300 hours",
      external_url: "#",
    },
    {
      code: "WEBDEV_GL_INTRO",
      title: "Introduction to Web Development",
      short_description:
        "Covers the basics of HTML, CSS, JavaScript, and responsive design principles.",
      category: "webdev",
      organization: "Great Learning",
      level: "Beginner",
      duration: "2–3 hours",
      external_url: "#",
    },
    {
      code: "WEBDEV_GL_REACT",
      title: "React JS Tutorial",
      short_description:
        "Learn React components, JSX, props, state, hooks, and basic routing.",
      category: "webdev",
      organization: "Great Learning",
      level: "Intermediate",
      duration: "2–3 hours",
      external_url: "#",
    },
    {
      code: "WEBDEV_GL_JQUERY",
      title: "jQuery Tutorial",
      short_description:
        "Explore DOM manipulation, events, effects, and animations with jQuery.",
      category: "webdev",
      organization: "Great Learning",
      level: "Beginner",
      duration: "1.5–2 hours",
      external_url: "#",
    },
    {
      code: "WEBDEV_FCC_JS_ADS",
      title: "JavaScript Algorithms & Data Structures",
      short_description:
        "Covers ES6, regular expressions, debugging, data structures, and OOP.",
      category: "webdev",
      organization: "freeCodeCamp",
      level: "Beginner",
      duration: "300 hours",
      external_url: "#",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO courses
    (code, title, short_description, image_url, detail_path, category, organization, level, duration, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  webDevCourses.forEach((c) => {
    stmt.run(
      c.code,
      c.title,
      c.short_description,
      null,
      "/student/webdevcourse.html",
      c.category,
      c.organization,
      c.level,
      c.duration,
      c.external_url
    );
  });

  stmt.finalize();
}

// ---------- SEED CYBER SECURITY COURSES ----------
function insertCyberCoursesIfMissing(db) {
  const cyberCourses = [
    {
      code: "CYBER_CS50_INTRO",
      title: "CS50's Intro to Cyber Security",
      short_description:
        "Covers security fundamentals, cryptography, and threat modeling.",
      category: "cyber",
      organization: "Harvard University",
      level: "Intermediate",
      duration: "10 weeks",
      external_url: "#",
    },
    {
      code: "CYBER_IBM_FUNDAMENTALS",
      title: "Cyber Security Fundamentals",
      short_description:
        "Learn about network security, cryptography, and incident response.",
      category: "cyber",
      organization: "IBM SkillBuild",
      level: "Beginner",
      duration: "6–8 hours",
      external_url: "#",
    },
    {
      code: "CYBER_SKILLINDIA_PROGRAM",
      title: "Program in Cyber Security",
      short_description:
        "Covers threat awareness, data protection, and privacy practices.",
      category: "cyber",
      organization: "Skill India",
      level: "Beginner",
      duration: "10–13 hours",
      external_url: "#",
    },
    {
      code: "CYBER_IBM_ENTERPRISE",
      title: "Enterprise Security in Practice",
      short_description:
        "Gain technical skills for better knowledge in the cyber security domain.",
      category: "cyber",
      organization: "IBM SkillBuild",
      level: "Beginner",
      duration: "10 hours",
      external_url: "#",
    },
    {
      code: "CYBER_IBM_THREAT_INTEL",
      title: "Threat Intelligence & Hunting",
      short_description:
        "Develop better knowledge in identifying and neutralizing threats.",
      category: "cyber",
      organization: "IBM SkillBuild",
      level: "Intermediate",
      duration: "5 hours",
      external_url: "#",
    },
    {
      code: "CYBER_STANFORD_ADV_PREVIEW",
      title: "Advanced Cyber Security Preview",
      short_description:
        "A snapshot of Stanford’s Advanced Cybersecurity Program.",
      category: "cyber",
      organization: "Stanford Engineering",
      level: "Intermediate",
      duration: "1 hour",
      external_url: "#",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO courses
    (code, title, short_description, image_url, detail_path, category, organization, level, duration, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  cyberCourses.forEach((c) => {
    stmt.run(
      c.code,
      c.title,
      c.short_description,
      null,
      "/student/cybersecurity.html",
      c.category,
      c.organization,
      c.level,
      c.duration,
      c.external_url
    );
  });

  stmt.finalize();
}

// ---------- SEED DATA ANALYTICS COURSES ----------
function insertDataAnalyticsCoursesIfMissing(db) {
  const daCourses = [
    {
      code: "DA_HARV_PY_RESEARCH",
      title: "Using Python for Research",
      short_description:
        "Covers Python programming, data analysis, and visualization with real case studies.",
      category: "data-analytics",
      organization: "Harvard University",
      level: "Intermediate",
      duration: "4–8 hours",
      external_url: "#",
    },
    {
      code: "DA_IBM_DS_FUNDAMENTALS",
      title: "Data Science Fundamentals",
      short_description:
        "Covers data collection, cleaning, visualization, statistics, and Python basics.",
      category: "data-analytics",
      organization: "IBM SkillBuild",
      level: "Intermediate",
      duration: "20 hours",
      external_url: "#",
    },
    {
      code: "DA_GL_INTRO_PANDAS",
      title: "Introduction to Pandas",
      short_description:
        "Covers data cleaning, manipulation, filtering, and grouping using Pandas.",
      category: "data-analytics",
      organization: "Great Learning",
      level: "Beginner",
      duration: "2.25 hours",
      external_url: "#",
    },
    {
      code: "DA_GOOGLE_ANALYTICS",
      title: "Google Data Analytics",
      short_description:
        "Gain an immersive understanding of the practices and processes used by data analysts.",
      category: "data-analytics",
      organization: "Google",
      level: "Beginner",
      duration: "6 months",
      external_url: "#",
    },
    {
      code: "DA_IBM_ML_DS",
      title: "Machine Learning for Data Science",
      short_description:
        "Covers supervised and unsupervised learning, regression, and clustering.",
      category: "data-analytics",
      organization: "IBM SkillBuild",
      level: "Intermediate",
      duration: "20 hours",
      external_url: "#",
    },
    {
      code: "DA_MS_POWERBI_ANALYST",
      title: "Microsoft Power BI Data Analyst",
      short_description:
        "Learn to use Power BI tools, create dashboards, and integrate with Microsoft Fabric.",
      category: "data-analytics",
      organization: "Microsoft",
      level: "Intermediate",
      duration: "5 hours",
      external_url: "#",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO courses
    (code, title, short_description, image_url, detail_path, category, organization, level, duration, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  daCourses.forEach((c) => {
    stmt.run(
      c.code,
      c.title,
      c.short_description,
      null,
      "/student/dataanalytics.html",
      c.category,
      c.organization,
      c.level,
      c.duration,
      c.external_url
    );
  });

  stmt.finalize();
}

// ---------- SEED DATA SCIENCE COURSES ----------
function insertDataScienceCoursesIfMissing(db) {
  const dsCourses = [
    {
      code: "DS_STANFORD_ML_SPEC",
      title: "Machine Learning Specialization",
      short_description:
        "An in-depth introduction to machine learning, data mining, and statistical pattern recognition.",
      category: "data-science",
      organization: "Stanford University",
      level: "Intermediate",
      duration: "11 weeks",
      external_url: "#",
    },
    {
      code: "DS_MICHIGAN_PY_EVERYBODY",
      title: "Python for Everybody",
      short_description:
        "Learn to program and analyze data with Python, from basics to databases.",
      category: "data-science",
      organization: "University of Michigan",
      level: "Beginner",
      duration: "5 months",
      external_url: "#",
    },
    {
      code: "DS_IBM_DS_PROFESSIONAL",
      title: "IBM Data Science Professional",
      short_description:
        "Develop hands-on skills using data science tools and real-world projects.",
      category: "data-science",
      organization: "IBM",
      level: "Beginner",
      duration: "11 months",
      external_url: "#",
    },
    {
      code: "DS_HOPKINS_DS_SPEC",
      title: "Data Science Specialization",
      short_description:
        "Covers the full data science pipeline from Johns Hopkins University.",
      category: "data-science",
      organization: "Johns Hopkins",
      level: "Intermediate",
      duration: "10 months",
      external_url: "#",
    },
    {
      code: "DS_GOOGLE_ADV_DA",
      title: "Google Advanced Data Analytics",
      short_description:
        "Prepare for a data science career with Google's advanced analytics program.",
      category: "data-science",
      organization: "Google",
      level: "Beginner",
      duration: "6 months",
      external_url: "#",
    },
    {
      code: "DS_DLAI_NLP_SPEC",
      title: "NLP Specialization",
      short_description:
        "Enter the world of Natural Language Processing, from sentiment analysis to translation.",
      category: "data-science",
      organization: "DeepLearning.AI",
      level: "Intermediate",
      duration: "4 months",
      external_url: "#",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO courses
    (code, title, short_description, image_url, detail_path, category, organization, level, duration, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  dsCourses.forEach((c) => {
    stmt.run(
      c.code,
      c.title,
      c.short_description,
      null,
      "/student/datascience.html",
      c.category,
      c.organization,
      c.level,
      c.duration,
      c.external_url
    );
  });

  stmt.finalize();
}

// ---------- SEED AI / ML COURSES ----------
function insertAIMLCoursesIfMissing(db) {
  const aimlCourses = [
    {
      code: "AIML_HARVARD_CS50_AI_PY",
      title: "CS50's Intro to AI with Python",
      short_description:
        "Covers search algorithms, neural networks, and more using Python.",
      category: "ai-ml",
      organization: "Harvard University",
      level: "Intermediate",
      duration: "7 weeks",
      external_url: "#",
    },
    {
      code: "AIML_IBM_AI_EVERYONE",
      title: "AI For Everyone",
      short_description:
        "AI basics, machine learning, neural networks, and real-world applications.",
      category: "ai-ml",
      organization: "IBM SkillBuild",
      level: "Beginner",
      duration: "6–8 hours",
      external_url: "#",
    },
    {
      code: "AIML_AWS_FUNDAMENTALS_ML",
      title: "Fundamentals of Machine Learning",
      short_description:
        "Basics of machine learning including threat awareness, data protection, and privacy.",
      category: "ai-ml",
      organization: "Amazon Web Services",
      level: "Beginner",
      duration: "1 hour",
      external_url: "#",
    },
    {
      code: "AIML_DLAI_AI_PY_BEGINNER",
      title: "AI with Python for Beginners",
      short_description:
        "Covers Python basics, NumPy, and simple AI applications.",
      category: "ai-ml",
      organization: "DeepLearning.AI",
      level: "Beginner",
      duration: "10 hours",
      external_url: "#",
    },
    {
      code: "AIML_AZURE_INTRO_AI",
      title: "Introduction to AI in Azure",
      short_description:
        "Covers Azure AI services, NLP, computer vision, and responsible AI.",
      category: "ai-ml",
      organization: "Microsoft Azure",
      level: "Intermediate",
      duration: "1 week",
      external_url: "#",
    },
    {
      code: "AIML_HARVARD_TINYML",
      title: "Deploying TinyML",
      short_description:
        "Run ML models on microcontrollers using TensorFlow Lite and IoT applications.",
      category: "ai-ml",
      organization: "Harvard University",
      level: "Intermediate",
      duration: "5 weeks",
      external_url: "#",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO courses
    (code, title, short_description, image_url, detail_path, category, organization, level, duration, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  aimlCourses.forEach((c) => {
    stmt.run(
      c.code,
      c.title,
      c.short_description,
      null,
      "/student/aiml.html",
      c.category,
      c.organization,
      c.level,
      c.duration,
      c.external_url
    );
  });

  stmt.finalize();
}

// ---------- SEED SOFTWARE DEVELOPMENT COURSES ----------
function insertSoftwareDevCoursesIfMissing(db) {
  const sdCourses = [
    {
      code: "SD_HARVARD_CS50_INTRO",
      title: "CS50's Intro to Computer Science",
      short_description:
        "Covers programming, algorithms, data structures, and Python.",
      category: "software-dev",
      organization: "Harvard University",
      level: "Intermediate",
      duration: "11 weeks",
      external_url: "#",
    },
    {
      code: "SD_SKILLINDIA_PYTHON",
      title: "Python Programming",
      short_description:
        "Covers Python syntax, data types, functions, and data structures.",
      category: "software-dev",
      organization: "Skill India",
      level: "Intermediate",
      duration: "20 hours",
      external_url: "#",
    },
    {
      code: "SD_CURSA_MOBILE_APP",
      title: "Mobile App Development",
      short_description:
        "Master app development with React Native, JavaScript, and Redux.",
      category: "software-dev",
      organization: "Cursa",
      level: "Intermediate",
      duration: "21 hours 40 min",
      external_url: "#",
    },
    {
      code: "SD_SIMPLILEARN_ANDROID",
      title: "Android App Development",
      short_description:
        "Build a strong foundation in Android app development fundamentals.",
      category: "software-dev",
      organization: "SimpliLearn",
      level: "Beginner",
      duration: "1 hour",
      external_url: "#",
    },
    {
      code: "SD_HARVARD_SCRATCH",
      title: "Intro to Programming with Scratch",
      short_description:
        "Learn block-based coding, variables, loops, and logical thinking.",
      category: "software-dev",
      organization: "Harvard University",
      level: "Beginner",
      duration: "3 weeks",
      external_url: "#",
    },
    {
      code: "SD_MICROSOFT_PY_BEGINNER",
      title: "Python for Beginners",
      short_description:
        "Get a strong foundation in Python for app development.",
      category: "software-dev",
      organization: "Microsoft",
      level: "Beginner",
      duration: "4 hours",
      external_url: "#",
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO courses
    (code, title, short_description, image_url, detail_path, category, organization, level, duration, external_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sdCourses.forEach((c) => {
    stmt.run(
      c.code,
      c.title,
      c.short_description,
      null,
      "/student/softwaredevelopment.html", // Software Dev page
      c.category,
      c.organization,
      c.level,
      c.duration,
      c.external_url
    );
  });

  stmt.finalize();
}

// ---------- SEED GIG GUIDE BOOKS ----------
function insertGigBooksIfMissing(db) {
  const gigBooks = [
    { title: ".NET Framework", topic: ".NET / Backend", provider: "GoalKicker", link: "https://goalkicker.com/DotNETFrameworkBook/" },
    { title: "Algorithms", topic: "Algorithms / CS Fundamentals", provider: "GoalKicker", link: "https://goalkicker.com/AlgorithmsBook/" },
    { title: "Android", topic: "Android Development", provider: "GoalKicker", link: "https://goalkicker.com/AndroidBook/" },
    { title: "Angular 2+", topic: "Frontend Framework", provider: "GoalKicker", link: "https://goalkicker.com/Angular2Book/" },
    { title: "Bash", topic: "Shell / DevOps", provider: "GoalKicker", link: "https://goalkicker.com/BashBook/" },
    { title: "C", topic: "Programming Language", provider: "GoalKicker", link: "https://goalkicker.com/CBook/" },
    { title: "C#", topic: "Programming Language", provider: "GoalKicker", link: "https://goalkicker.com/CSharpBook/" },
    { title: "C++", topic: "Programming Language", provider: "GoalKicker", link: "https://goalkicker.com/CPlusPlusBook/" },
    { title: "CSS", topic: "Web / Frontend", provider: "GoalKicker", link: "https://goalkicker.com/CSSBook/" },
    { title: "Git", topic: "Version Control / DevOps", provider: "GoalKicker", link: "https://goalkicker.com/GitBook/" },
    { title: "Haskell", topic: "Functional Programming", provider: "GoalKicker", link: "https://goalkicker.com/HaskellBook/" },
    { title: "HTML5", topic: "Web / Frontend", provider: "GoalKicker", link: "https://goalkicker.com/HTML5Book/" },
    { title: "iOS", topic: "iOS / Mobile", provider: "GoalKicker", link: "https://goalkicker.com/iOSBook/" },
    { title: "Java", topic: "Programming Language", provider: "GoalKicker", link: "https://goalkicker.com/JavaBook/" },
    { title: "JavaScript", topic: "Web / Frontend", provider: "GoalKicker", link: "https://goalkicker.com/JavaScriptBook/" },
    { title: "jQuery", topic: "Web / Frontend", provider: "GoalKicker", link: "https://goalkicker.com/jQueryBook/" },
    { title: "Kotlin", topic: "Programming Language / Android", provider: "GoalKicker", link: "https://goalkicker.com/KotlinBook/" },
    { title: "Linux", topic: "OS / DevOps", provider: "GoalKicker", link: "https://goalkicker.com/LinuxBook/" },
    { title: "MongoDB", topic: "Database / NoSQL", provider: "GoalKicker", link: "https://goalkicker.com/MongoDBBook/" },
    { title: "Python", topic: "Programming / Data / Backend", provider: "GoalKicker", link: "https://goalkicker.com/PythonBook/" },
    { title: "React JS", topic: "Frontend Framework", provider: "GoalKicker", link: "https://goalkicker.com/ReactJSBook/" },
    { title: "React Native", topic: "Mobile / Cross-Platform", provider: "GoalKicker", link: "https://goalkicker.com/ReactNativeBook/" },
    { title: "Ruby on Rails", topic: "Web Framework", provider: "GoalKicker", link: "https://goalkicker.com/RubyOnRailsBook/" },
    { title: "SQL", topic: "Database / SQL", provider: "GoalKicker", link: "https://goalkicker.com/SQLBook/" },
    { title: "Swift", topic: "iOS / Programming", provider: "GoalKicker", link: "https://goalkicker.com/SwiftBook/" }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO gig_books (title, topic, provider, link)
    VALUES (?, ?, ?, ?)
  `);

  gigBooks.forEach((b) => {
    stmt.run(b.title, b.topic, b.provider, b.link);
  });

  stmt.finalize();
}

module.exports = db;

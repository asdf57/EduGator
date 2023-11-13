const express = require("express");
const pg = require("pg");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const ejs = require("ejs");

const db = require("./scripts/database");
const course = require("./scripts/course");
const { LoginType, getUserType } = require('./scripts/roles');

const app = express();
const SALT_ROUNDS = 10;
const SESSION_DURATION = 1200000;
const HOSTNAME = "0.0.0.0";
const PORT = process.env.PORT;
const ROLES = ["admin", "teacher", "student"];

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'templates'));

const pool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT
});

pool.connect().then(function () {
  console.log(`Connected to database!`);
});

app.use(session({
  secret: process.env.SIGNING_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: SESSION_DURATION }
}));
app.use(express.json());
app.use("/scripts", express.static(path.join(__dirname, "..", "frontend", "scripts")));
app.use("/dist", express.static(path.join(__dirname, "..", "frontend", "dist")));
app.use("/assets", express.static(path.join(__dirname, "..", "frontend", "assets")));
app.use((req, res, next) => {
  if (req.session.isAuthenticated)
    return next();

  if (req.path === '/login')
    return next();

  res.redirect('/login');
});

app.use((err, req, res, next) => {
  return res.status(400).end();
});

function getHtmlPath(filename) {
  return path.join(__dirname, "..", "frontend", "public", filename);
}

//Hardcode admin user for time being
function generateTestUsers() {
  try {
    const adminUsername = "root";

    bcrypt.hash("hunter2", SALT_ROUNDS, async function(err, hashedPassword) {
      const userQuery = await pool.query(`SELECT password_hash FROM admin WHERE username = $1`, [adminUsername]);
      if (userQuery.rows.length >= 1)
        return;

      if (err) {
        console.error('Hashing failed', err);
      } else {
        await pool.query('INSERT INTO admin (username, actualname, password_hash) VALUES ($1, $2, $3)', [adminUsername, "Hunter2", hashedPassword]);
      }
    });
  } catch(error) {
    console.log(`Failed to create test users: ${error}`)
  }
}

generateTestUsers();


app.get("/home", async (req, res) => {
  const student_query = await pool.query(`SELECT student.id FROM student WHERE student.username='testUser'`)
  const student_num = student_query.rows[0]

  const class_query = await pool.query(`SELECT 
  student_courses.id,
  student_courses.id,
  courses.course_name,
  courses.description,
  courses.teacher_id,
  courses.course_start,
  courses.course_end
  FROM student
  JOIN student_courses ON student.id = student_courses.id
  JOIN courses ON student_courses.id = courses.id 
  WHERE student_courses.id = $1`, [student_num.id]);
  return res.render("home", {username: req.session.username, role: req.session.role, courses: class_query.rows});
  // return res.contentType("text/html").send(await renderTemplateFile("home.ejs", {role: req.session.role}));
});

app.get("/login", async (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/home');
  } else {
    return res.sendFile(getHtmlPath("login.html"));
  }
});

app.get("/create", async (req, res) => {
  try {
    const role = req.session.role;

    if (role === LoginType.Admin) {
      courses = await course.getAllCourses(pool);
      res.render("create", {courses: courses, username: req.session.username, role: req.session.role});
    } else {
      return res.sendFile(getHtmlPath("login.html"));
    }
  } catch (error) {
    console.log(`Error in create route: ${error}`);
    return res.status(500).send("Unexpected error occurred. Please try again later!");
  }
});

app.get("/delete", async (req, res) => {
    try {
        const role = req.session.role;

        if (role === LoginType.Admin) {
            const admins = await db.getAllEntriesFromRole(pool, LoginType.Admin);
            const students = await db.getAllEntriesFromRole(pool, LoginType.Student);
            const teachers = await db.getAllEntriesFromRole(pool, LoginType.Teacher);

            res.render("delete", {admins: admins, students: students, teachers: teachers, username: req.session.username, role: req.session.role});
        } else {
            return res.sendFile(getHtmlPath("login.html"));
        }
    } catch (error) {
        console.log(`Error in create route: ${error}`);
        return res.status(500).send("Unexpected error occurred. Please try again later!");
    }
});

app.post("/delete", async (req, res) => {
    try {
        const usernames = req.body.usernames;
        const userRole = req.body.role;
        const sessionRole = req.session.role;

        if (sessionRole !== LoginType.Admin) {
            return res.status(401).json({error: "Insufficient permissions to create users!"});
        }

        if (!usernames || !userRole) {
            return res.sendStatus(401);
        }

        if (typeof usernames !== "object" || typeof userRole !== "string") {
            return res.sendStatus(401);
        }

        if (!ROLES.includes(userRole)) {
            return res.status(400).json({"error": "Invalid role was provided!"});
        }

        if (usernames.length <= 0){
            return res.status(400).json({"error": "No users were selected!"});
        }

        if (usernames.includes("root") && userRole === LoginType.Admin) {
            return res.status(400).json({"error": "Cannot delete the root admin user!"});
        }

        for (let i = 0; i < usernames.length; i++) {
            const query = pool.query(`DELETE FROM ${userRole} WHERE username = $1`, [usernames[i]]);
            if (!query) {
                return res.status(500).json({"error": "Error while deleting user(s)!"});
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({error: "Unexpected error occurred. Please try again later!"});
    }
});

app.post("/create", async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const actualName = req.body.actualName;
    const academicYear = req.body.academicYear;
    const graduationDate = req.body.graduationDate;
    const userRole = req.body.role;
    const selectedCourses = req.body.courses;
    const sessionRole = req.session.role;

    if (sessionRole !== LoginType.Admin)
      return res.status(401).json({error: "Insufficient permissions to create users!"});

    if (!username || !password || !userRole)
      return res.sendStatus(401);

    if (!ROLES.includes(userRole))
      return res.status(400).json({"error": "Invalid role was provided!"});

    if (!typeof username == "string" || !typeof password == "string")
      return res.status(400).json({"error": "Username or password is not a string!"});

    if (username.length < 1 || username.length > 25)
      return res.status(400).json({"error": `Username has invalid length ${username.length}: Must be between 1 and 25 characters`});

    if (password.length < 5 || password.length > 36)
      return res.status(400).json({"error": `Password has invalid length ${password.length}: Must be between 5 and 36 characters`});

    const userQuery = await pool.query(`SELECT password_hash FROM ${userRole} WHERE username = $1`, [username]);
    if (userQuery.rows.length >= 1)
      return res.status(500).json({error: "An error occurred"});

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    if (!hashedPassword)
      return res.status(500).json({error: "An error occurred"});

    if (getUserType(userRole) === LoginType.Admin && selectedCourses.length > 0){
      return res.status(500).json({error: "Admins cannot specify courses!"});
    }

    for (let i = 0; i < selectedCourses.length; i++) {
      const courseQuery = await pool.query(`SELECT * FROM courses WHERE id = $1`, [selectedCourses[i]]);
      if (courseQuery.rows.length < 1)
        return res.status(500).json({error: "Could not find course in the database!"});
    }

    let insertQuery;
    if (getUserType(userRole) === LoginType.Student) {
      insertQuery = await pool.query(
          `INSERT INTO student (username, actualname, academic_year, expected_graduation, password_hash) VALUES ($1,$2,$3,$4,$5)`,
          [username, actualName, academicYear, graduationDate, hashedPassword]
      );

      const id = await db.getIdFromUsername(username, LoginType.Student, pool);
      if (!id) {
        return res.status(500).json({error: "Could not obtain a corresponding student ID!"});
      }

      for (let i = 0; i < selectedCourses.length; i++) {
        const courseQuery = await pool.query(
          `INSERT INTO student_courses (student_id, course_id) VALUES ($1, $2)`,
          [id, selectedCourses[i]]
        );

        if (!courseQuery)
          return res.status(500).json({error: "An error occurred while registering for the selected course(s)!"});
      }

    } else if (getUserType(userRole) === LoginType.Teacher) {
      insertQuery = await pool.query(
          `INSERT INTO teacher (username, actualname, password_hash) VALUES ($1,$2,$3)`,
          [username, actualName, hashedPassword]
      );

      const id = await db.getIdFromUsername(username, LoginType.Teacher, pool);
      if (!id) {
        return res.status(500).json({error: "Could not obtain a corresponding teacher ID!"});
      }

      for (let i = 0; i < selectedCourses.length; i++) {
        const courseQuery = await pool.query(
          `UPDATE courses SET teacher_id = $1 WHERE id = $2;`,
          [id, selectedCourses[i]]
        );

        if (!courseQuery)
          return res.status(500).json({error: "An error occurred while registering the teacher to the selected course(s)!"});
      }
    } else {
      insertQuery = await pool.query(
          `INSERT INTO admin (username, actualname, password_hash) VALUES ($1,$2,$3)`,
          [username, actualName, hashedPassword]
      );
    }

    if (!insertQuery)
      return res.status(500).json({error: "An error occurred while creating the user!"});
  } catch (error) {
    console.log(error);
    return res.status(500).json({error: "Unexpected error occurred. Please try again later!"});
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!ROLES.includes(role)) {
      return res.status(401).json({"error": "Invalid role was provided!"});
    }

    const queryRes = await pool.query(`SELECT password_hash FROM ${role} WHERE username = $1`, [username]);

    if (queryRes.rows.length === 0) {
      return res.status(401).json({"error": "Invalid username/password"});
    }

    const hashedPassword = queryRes.rows[0].password_hash;

    const matchRes = await bcrypt.compare(password, hashedPassword);
    if (!matchRes){
      return res.status(401).json({error: "Unauthorized"});
    }

    // Verified correct password submitted, proceed to session auth
    req.session.isAuthenticated = true;
    req.session.role = getUserType(role);
    req.session.username = username;
    return res.redirect('/home');
  } catch(error) {
    console.log(error);
    return res.status(500).json({error: "Unexpected error occurred. Please try again later!"});
  }
});

app.get("/course/:courseId", async (req, res) => {
    const courseId = req.params.courseId;

    // If no course specified, just show available course cards
    // if (courseId === undefined) {
    //     return res.render("course", );
    // }

    if (req.session.role === LoginType.Admin) {
        return res.status(401).json({error: "Admin role cannot access courses!"});
    }

    const courseIdQuery = await pool.query(`SELECT * FROM courses WHERE id = $1`, [courseId]);
    if (!courseIdQuery) {
        return res.status(500).json({"error": "Error checking if course is valid!"});
    }

    if (courseIdQuery.length <= 0) {
        return res.status(400).json({"error": "Course does not exist!"});
    }

    const entityId = await db.getIdFromUsername(req.session.username, req.session.role);

    const enrollmentQuery = await pool.query(`SELECT * FROM ${req.session.role} WHERE id = $1`, [entityId]);
    if (!enrollmentQuery) {
        return res.status(400).json({"error": "Invalid user!"});
    }

    if (enrollmentQuery.length <= 0) {
        return res.status(400).json({"error": "User not enrolled in course!"});
    }

    const courseTabsQuery = await pool.query(`SELECT * FROM course_tabs WHERE course_id = $1`, [courseId]);
    if (!courseTabsQuery) {
        return res.status(500).json({"error": "Error checking for course tabs!"});
    }

    res.render("course", {username: req.session.username, role: req.session.role, courseTabs: courseTabsQuery.rows});
});


app.listen(PORT, HOSTNAME, () => {
  console.log(`http://${HOSTNAME}:${PORT}`);
});
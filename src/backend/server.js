const express = require("express");
const pg = require("pg");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const ejs = require("ejs");

const { LoginType, getUserType } = require('./utils/roles');

const app = express();
const SALT_ROUNDS = 10;
const SESSION_DURATION = 1200000; // 20 minutes
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

  console.log("User does not have a valid session!");
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

async function renderTemplateFile(filename, data) {
  return await ejs.renderFile(path.join(__dirname, `templates/${filename}`), data, {async: true});
}

app.get("/home", async (req, res) => {
  return res.render("home", {username: req.session.username, role: req.session.role});
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
      return res.sendFile(getHtmlPath("create.html"));
    } else {
      return res.sendFile(getHtmlPath("login.html"));
    }
  } catch (error) {
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

    let insertQuery;
    if (getUserType(userRole) === LoginType.Student) {
      insertQuery = await pool.query(
          `INSERT INTO student (username, actualname, academic_year, expected_graduation, password_hash) VALUES ($1,$2,$3,$4,$5)`,
          [username, actualName, academicYear, graduationDate, hashedPassword]
      );
    } else if (getUserType(userRole) === LoginType.Teacher) {
      insertQuery = await pool.query(
          `INSERT INTO teacher (username, actualname, password_hash) VALUES ($1,$2,$3)`,
          [username, actualName, hashedPassword]
      );
    } else {
      insertQuery = await pool.query(
          `INSERT INTO admin (username, actualname, password_hash) VALUES ($1,$2,$3)`,
          [username, actualName, hashedPassword]
      );
    }

    if (!insertQuery)
      return res.status(500).json({error: "An error occurred while creating the user!"});
  } catch (error) {
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

app.listen(PORT, HOSTNAME, () => {
  console.log(`http://${HOSTNAME}:${PORT}`);
});
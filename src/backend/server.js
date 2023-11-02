const express = require("express");
const pg = require("pg");
const path = require("path");
const session = require("express-session")


const app = express();
const SESSION_DURATION = 60000;
const HOSTNAME = "0.0.0.0";
const PORT = process.env.PORT;
const ROLES = ["admin", "teacher", "student"];
const LoginType = {
	Student: "student",
	Teacher: "teacher",
	Admin: "admin",
  Unknown: "unknown"
};
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect();

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
app.use(express.static(path.join(__dirname, "..", "frontend", "public")));
app.use((req, res, next) => {
  console.log('Global middleware session:', req.session);
  console.log("Authed: ", req.session.isAuthenticated);

  if (req.session.isAuthenticated)
    return next();
  
  if (req.path === '/login' || req.path === '/login.html')
    return next();

  console.log("Not authed!");
  res.redirect('/login.html');
});

app.use((err, req, res, next) => {
  return res.status(400).end();
});

function getUserType(req) {
  if (req.session.role == "student")
    return LoginType.Student;
  else if (req.session.role == "teacher")
    return LoginType.Teacher;
  else if (req.session.role == "admin")
    return LoginType.Admin;

  return LoginType.Unknown;
}

app.get("/home", (req, res) => {
  const userType = req.session.role;
});

app.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  console.log("Received: ", req.body, req.headers);

  if (req.session.isAuthenticated || username === "test") {
    req.session.isAuthenticated = true;
    req.session.role = role;
    return res.redirect('/home.html');
  } else {
    return res.status(401).json({"error": "Unauthorized"});
  }
});

app.listen(PORT, HOSTNAME, () => {
  console.log(`http://${HOSTNAME}:${PORT}`);
});

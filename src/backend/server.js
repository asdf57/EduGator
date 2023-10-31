let express = require("express");
let path = require("path");

const hostname = "0.0.0.0";
const port = process.env.PORT;
const app = express();

const SESSIONS = {};
const SESSION_DURATION = 3600000;

// Middleware Handlers
app.use("/scripts", express.static(path.join(__dirname, "..", "frontend", "scripts")));
app.use("/dist", express.static(path.join(__dirname, "..", "frontend", "dist")));
app.use("/assets", express.static(path.join(__dirname, "..", "frontend", "assets")));
app.use(express.static(path.join(__dirname, "..", "frontend", "public")));

const LoginType = {
	Student: "student",
	Teacher: "teacher",
	Admin: "admin",
}


// function getLoginType() {
//   return ...
// }

// Global login session middleware
app.use((req, res, next) => {
  if (isUserAuthenticated(req.cookies)) {
    const sessionId = generateUniqueSessionId();
    SESSIONS[sessionId] = {
        user: username,
        lastAccess: Date.now()
    };

    res.cookie('sessionId', sessionId);
    res.redirect('/home');
  } else {
    console.log("Not authed!");
    res.redirect('/index.html');
  }

  next();
});

// Checks to see if a valid session token exists and isn't expired
function isUserAuthenticated(cookies) {
  return cookies &&
         cookies.sessionId &&
         SESSIONS[sessionId] &&
         (Date.now() - SESSIONS[sessionId].lastAccess) < SESSION_DURATION;
}

app.post("/login", (req, res) => {
  if (isUserAuthenticated()) {
    const sessionId = generateUniqueSessionId();
    SESSIONS[sessionId] = {
        user: username,
        lastAccess: Date.now()
    };
    res.cookie('sessionId', sessionId);
    res.redirect('/');
  } else {
      res.redirect('/login');
  }
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});

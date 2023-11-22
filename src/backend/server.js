const express = require("express");
const pg = require("pg");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require('multer');
const fs = require('fs');

const db = require("./scripts/database");
const course = require("./scripts/course");
const { LoginType, getUserType } = require('./scripts/roles');

const app = express();
const SALT_ROUNDS = 10;
const SESSION_DURATION = 1200000;
const HOSTNAME = "0.0.0.0";
const PORT = process.env.PORT;
const ROLES = ["admin", "teacher", "student"];

//Have Multer use in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

app.use(express.urlencoded({ extended: true }));

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
  try {
      let courses = [];
      if (req.session.role === 'teacher' || req.session.role === 'student') {
          const id = await db.getIdFromUsername(req.session.username, req.session.role, pool);

            if (!id) {
                return res.status(500).json({error: "User does not exist!"});
            }

            const classQuery = await pool.query(`
                SELECT 
                ${req.session.role}_courses.course_id,
                ${req.session.role}_courses.${req.session.role}_id,
                courses.course_name,
                courses.description,
                courses.course_start,
                courses.course_end
                FROM ${req.session.role}
                JOIN ${req.session.role}_courses ON ${req.session.role}.id = ${req.session.role}_courses.${req.session.role}_id
                JOIN courses ON ${req.session.role}_courses.course_id = courses.id
                WHERE ${req.session.role}_courses.${req.session.role}_id = $1
            `, [id]);
            
            if (classQuery && classQuery.rows && classQuery.rows.length > 0) {
                courses = classQuery.rows;
            }
      }

      return res.render("home", {
          username: req.session.username, 
          role: req.session.role, 
          courses: courses
      });
  } catch (error) {
      console.error(error);
      res.status(500).json("Error loading page");
  }
});

app.get("/login", async (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/home');
  } else {
    return res.sendFile(getHtmlPath("login.html"));
  }
});

app.get("/logout", async (req, res) => {
    if (req.session.isAuthenticated) {
        req.session.destroy();
        return res.sendFile(getHtmlPath("login.html"));
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

app.get("/createCourse", (req, res) => {
  if (req.session.role !== "admin") {
    return res.redirect('/login');
  }
  res.render("course/create_course", {
    username: req.session.username,
    role: req.session.role
  });
});

app.post("/createCourse", async (req, res) => {
  console.log("received request body:",req.body);
  console.log("Course Name:", req.body.courseName);
  console.log("Description:", req.body.description);
  console.log("Course Start:", req.body.courseStart);
  console.log("Course End:", req.body.courseEnd);
  try {
      if (req.session.role !== "admin") {
          return res.status(401).send("Unauthorized");
      }
      const { courseName, description, courseStart, courseEnd } = req.body;
      if (!courseName || !description || !courseStart || !courseEnd) {
        return res.status(400).send("Missing course information");
      } 
      await pool.query('INSERT INTO courses (course_name, description, course_start, course_end) VALUES ($1, $2, $3, $4)', [courseName, description, courseStart, courseEnd]);
      res.redirect('/home');
  } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
  }
});

app.get("/home", async (req, res) => {
  try {
      const courses = await pool.query('SELECT * FROM courses');
      res.render("home", { courses: courses.rows, username: req.session.username, role: req.session.role });
  } catch (error) {
      console.error(error);
      res.status(500).send("Error loading courses");
  }
});

app.post("/delete-course/:courseId", async (req, res) => {
  const { courseId } = req.params;
  if (req.session.role !== "admin") {
      return res.status(403).send('Unauthorized');
  }
  try {
      await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
      res.status(200).send('Course deleted successfully');
  } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting course');
  }
});

app.post("/upload/:type", upload.any(), async (req, res) => {
  try {
    const type = req.params.type;

    if (!type || typeof type !== "string" || !["content", "submission"].includes(type)) {
      return res.status(400).json({error: "Invalid upload type was specified!"});
    }

    const files = req.files;

    if (type === "content") {
      if (req.session.role !== LoginType.Teacher) {
        return res.status(401).json({error: "Unauthorized"});
      }

      const fileIdRes = {}

      for (const file of files) {
        //Create file
        const fileQuery = await pool.query(`INSERT INTO files (file_name, file_type, file_size, file_data) VALUES ($1,$2,$3,$4) RETURNING id`, [file.originalname, file.mimetype, file.size, file.buffer]);

        if (!fileQuery || !fileQuery.rows || fileQuery.rows.length == 0) {
          return res.status(500).json({error: "Failed to insert uploaded file(s)!"});
        }

        const fileId = fileQuery.rows[0].id;
        console.log(fileId);
        fileIdRes[file.originalname] = fileId;
      }

      return res.json(fileIdRes);
    }

    if (req.session.role !== LoginType.Student) {
      return res.status(401).json({error: "Unauthorized"});
    }

    for (const file of files) {
      const fileBuffer = fs.readFileSync(file.path);
      const query = 'INSERT INTO files(file_name, file_data) VALUES($1, $2)';
      const values = [file.originalname, fileBuffer];
      await pool.query(query, values);
    }
  } catch (error) {
    return res.status(500).json({error: error});
  }
});

app.get("/course/:courseId/:courseTab?", async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const courseTabId = req.params.courseTab;

    if (req.session.role === LoginType.Admin) {
      return res.status(401).json({error: "Admin role cannot access courses!"});
    }

    //Get the course information
    const courseIdQuery = await pool.query(`SELECT * FROM courses WHERE id = $1`, [courseId]);
    if (!courseIdQuery) {
      return res.status(500).json({"error": "Error checking if course is valid!"});
    }

    if (courseIdQuery.length <= 0) {
      return res.status(400).json({"error": "Course does not exist!"});
    }

    const isCourseTabValid = await db.isCourseTabInValidCourse(courseTabId, courseId, pool);

    if (courseTabId && !isCourseTabValid) {
      return res.status(500).json({"error": "Course tab does not exist in course!"});
    }

    //Get the ID from the username
    const entityId = await db.getIdFromUsername(req.session.username, req.session.role);

    //Check that the user exists!
    const enrollmentQuery = await pool.query(`SELECT * FROM ${req.session.role} WHERE id = $1`, [entityId]);
    if (!enrollmentQuery) {
        return res.status(400).json({"error": "Invalid user!"});
    }

    if (enrollmentQuery.length <= 0) {
        return res.status(400).json({"error": "User not enrolled in course!"});
    }

    //Obtain all course tabs for the selected course to display in the course sidebar
    const courseTabsQuery = await pool.query(`SELECT * FROM course_tabs WHERE course_id = $1 ORDER BY order_id;`, [courseId]);
    if (!courseTabsQuery) {
        return res.status(500).json({"error": "Error checking for course tabs!"});
    }

    //Get the course modules under the current selected course tab
    const courseModules = await db.getCourseModulesFromTab(pool, courseTabId);

    //Shortcut to obtain info on the selected course tab
    const courseTab = courseTabsQuery.rows.find(item => item.id == courseTabId);

    //If we've specified a coursetab ID, render the coursetab page instead
    if (courseTabId) {
      return res.render("course/content_area", {
        username: req.session.username,
        role: req.session.role,
        courseTabId: courseTabId,
        courseId: courseId,
        courseTabs: courseTabsQuery.rows,
        courseModules: courseModules,
        courseTab: courseTab
      });
    }

    res.render("course/course", {username: req.session.username, role: req.session.role, courseId: courseId, courseTabs: courseTabsQuery.rows});
  } catch (error) {
      console.error(error);
      res.status(500).send("Error loading course page");
  }
});

app.get("/course-content/:courseId/:contentType", async (req, res) => {
  const courseId = req.params.courseId;
  const contentType = req.params.contentType;
  let contentHtml = '<p>No content available.</p>';
  if (contentType === 'info') {
      contentHtml = '<p>Course information will be displayed here.</p>';
  } else if (contentType === 'announcements') {
      contentHtml = '<p>Announcements will be displayed here.</p>';
  }
  res.send(contentHtml);
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

app.post("/delete/file", async (req, res) => {
  try {
    const fileId = req.body.fileid;

    if (!fileId) {
      return res.status(500).json({error: "File name of file to delete is invalid!"});
    }

    if (!await db.isFileInDatabase(fileId, pool)) {
      return res.status(500).json({error: "File doesn't exist in database!"});
    }

    await pg.query(`DELETE FROM files WHERE id = $1`, [fileId]);
  } catch (error) {
    return res.status(500).json({error: error});
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

async function createCourseTab(req, res) {
  try {
    const tabName = req.body.tabName;
    const courseId = req.body.courseId;

    if (req.session.role !== LoginType.Teacher)
      return res.status(401).json({error: "Insufficient permissions to add course tab!"});

    if (!tabName || !courseId) {
        return res.status(401).json({error: "Missing required parameter!"});
    }

    const courseIdQuery = await pool.query(`SELECT * FROM courses WHERE id = $1`, [courseId]);
    if (!courseIdQuery)
        return res.status(500).json({error: "Couldn't find course!"});

    const addCourseTabQuery = await pool.query(`INSERT INTO course_tabs (tab_name, course_id, visibility) VALUES ($1, $2, $3)`, [tabName, courseId, true]);
    if (!addCourseTabQuery) {
        return res.status(500).json({error: "Failed to add course tab!"});
    }
  } catch (error) {
    return res.status(500).json({error: error});
  }
}

async function createCourseModule(req, res) {
  const courseTabId = req.body.courseTabId;

  //create course module
  const courseModuleId = await db.createCourseModule(req.body, pool);
  console.log("courseModuleId: ", courseModuleId);

  //Associate the newly created course module with course tab (if specified)
  if (courseModuleId && courseTabId) {
    //Validate courseTabId
    if (await db.isCourseTabInDatabase(pool, courseTabId) === undefined) {
      return res.status(500).json({error: "Course tab does not exist in database!"});
    }

    await db.associateCourseTabAndModule(pool, courseTabId, courseModuleId);
  }

  //create assignment in course module (if required)
  return res.end();
}

app.post("/update/:entity/:type", async (req, res) => {
  try {
    const entity = req.params.entity;
    const type = req.params.type;

    if (!entity || !type) {
      return res.status(400).json({error: "Missing a required item for update!"});
    }

    if (typeof entity !== "string" || typeof type !== "string") {
      return res.status(400).json({error: "Item is invalid!"});
    }

    if (entity === "coursemodule" && type === "order") {
      const order = req.body.order;
      const courseTabId = req.body.courseTabId;

      if (!order || typeof order !== "object") {
        return res.status(400).json({error: "Invalid coursetab ordering sent!"});
      }

      if(!courseTabId || typeof courseTabId !== "string") {
        return res.status(400).json({error: "Invalid courseTabId value sent!"});
      }

      const isCourseTabIdValid = db.isCourseTabInDatabase(pool, courseTabId);

      if (!isCourseTabIdValid) {
        return res.status(400).json({error: "Course tab does not exist!"});
      }

      Object.entries(order).forEach(async ([courseModuleId, orderId]) => {
        const updateOrderQuery = await pool.query(`
        UPDATE course_modules
        SET order_id = $1
        WHERE id = $2
        AND EXISTS (
            SELECT 1
            FROM tab_course_module
            WHERE course_module_id = $2
            AND tab_id = $3
        );`,
        [orderId, courseModuleId, courseTabId]);

        if (!updateOrderQuery) {
          return res.status(500).json({error: "Failed to update course tab order!"});
        }
      });

      return res.send();
    }

    if (entity === "coursetab" && type === "order") {
      const order = req.body.order;
      const courseId = req.body.courseId;

      if (!order || typeof order !== "object") {
        return res.status(400).json({error: "Invalid coursetab ordering sent!"});
      }

      if(!courseId || typeof courseId !== "string") {
        return res.status(400).json({error: "Invalid courseId value sent!"});
      }

      const isCourseIdValid = db.isCourseInDatabase(courseId, pool);

      if (!isCourseIdValid) {
        return res.status(400).json({error: "Course does not exist!"});
      }

      Object.entries(order).forEach(async ([courseTabId, order_id]) => {
        const updateOrderQuery = await pool.query(`UPDATE course_tabs SET order_id=$1 WHERE id=$2 AND course_id=$3; `, [order_id, courseTabId, courseId]);
        if (!updateOrderQuery) {
          return res.status(500).json({error: "Failed to update course tab order!"});
        }
      });

      return res.send();
    }
  } catch (error) {
    return res.status(500).json({error: error});
  }
});

app.post("/update/coursetab/:item", async (req, res) => {
  try {
    const item = req.params.item;

    if (!item || typeof item !== "string") {
      return res.status(400).json({error: "Item specified is invalid!"});
    }

    if (item === "order") {
      
    }
  } catch (error) {
    return res.status(500).json({error: error});
  }
});

app.post("/create/:type", async (req, res) => {
  try {
    const createType = req.params.type;

    if (createType === "coursetab") {
        return await createCourseTab(req, res);
    }

    if (createType === "coursemodule") {
      return await createCourseModule(req, res);
    }

    if (createType === "entity"){
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
              `INSERT INTO teacher_courses (teacher_id, course_id) VALUES ($1, $2)`,
              [id, selectedCourses[i]]
            );
  
            if (!courseQuery)
              return res.status(500).json({error: "An error occurred while registering for the selected course(s)!"});
        }
      } else {
        insertQuery = await pool.query(
            `INSERT INTO admin (username, actualname, password_hash) VALUES ($1,$2,$3)`,
            [username, actualName, hashedPassword]
        );
      }

      if (!insertQuery) {
        return res.status(500).json({error: "An error occurred while creating the user!"});
      }
    }

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

app.listen(PORT, HOSTNAME, () => {
  console.log(`http://${HOSTNAME}:${PORT}`);
});

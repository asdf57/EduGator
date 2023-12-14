//Imports
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

//Global constants
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

//Global Postgres database object
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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

app.get("/home", async (req, res) => {
    try {
        let courses = [];
        if (req.session.role === 'teacher' || req.session.role === 'student') {
            const id = await db.getIdFromUsername(pool, req.session.username, req.session.role);

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

        return res.render("pages/home", {
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
        return res.render("pages/login");
    }
});

app.get("/logout", async (req, res) => {
    if (req.session.isAuthenticated) {
        req.session.destroy();
    }

    return res.render("pages/login");
});

app.get("/create", async (req, res) => {
    try {
        const role = req.session.role;

        if (role === LoginType.Admin) {
            const courses = await course.getAllCourses(pool);
            res.render("pages/create", {courses: courses, username: req.session.username, role: req.session.role});
        } else {
            return res.render("pages/login");
        }
    } catch (error) {
        console.log(`Error in create route: ${error}`);
        return res.status(500).send(`Could not perform creation: ${error}`);
    }
});

app.get("/createCourse", (req, res) => {
    if (req.session.role !== "admin") {
        return res.redirect('/login');
    }

    return res.render("pages/create_course", {
        username: req.session.username,
        role: req.session.role
    });
});

app.post("/createCourse", async (req, res) => {
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
        return res.status(500).json({error: `Failed to create course due to error: ${error}`});
    }
});

app.get("/home", async (req, res) => {
    try {
        const courses = await pool.query('SELECT * FROM courses');
        return res.render("pages/home", { courses: courses.rows, username: req.session.username, role: req.session.role });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error loading courses");
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

//Associates already uploaded files with student submission
app.post("/upload/submission", upload.any(), async (req, res) => {
    try {
        //Get the assignment and file ids for the files the user uploaded from the payload
        const { assignmentId, fileIds } = req.body;
        const studentId = await db.getIdFromUsername(pool, req.session.username, req.session.role);

        if (!studentId) {
            return res.status(500).render("pages/error", {
                error: "Couldn't upload submission for student!",
                username: req.session.username,
                role: req.session.role
            });
        }

        if (req.session.role !== LoginType.Student) {
            return res.status(401).json({error: "Unauthorized"});
        }

        //Associate the uploaded files
        for (const fileId of Object.values(fileIds)){
            console.log(`Received submission file id for assignment ${assignmentId}: ${fileId}`);
            await db.associateStudentFilesToAssignment(pool, fileId, assignmentId, studentId);
        }

        return res.end();
    } catch (error) {
        return res.status(500).render("pages/error", {
            error: "Couldn't upload submission for student!",
            username: req.session.username,
            role: req.session.role
        });
    }
});

//Creates files
app.post("/upload/content", upload.any(), async (req, res) => {
    try {
        const files = req.files;
        const responseArray = [];

        // Create files
        for (const file of files) {
            const fileId = await db.createFile(pool, file);
            console.log(`Got file id: ${fileId}`);
            if (!fileId) {
                return res.status(500).json({error: "Failed to insert uploaded file(s)!"});
            }

            responseArray.push({ id: fileId, name: file.originalname });
        }

        return res.json(responseArray);
    } catch (error) {
        console.log(`Failed to upload file due to error: ${error}`);
        return res.status(500).json({error: `Failed to upload file due to error: ${error}`});
    }
});

//Retrieves a file attached to a course module
app.get("/course/:courseId/:courseTab/:courseModuleId/:fileId", async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const courseTabId = req.params.courseTab;
        const courseModuleId = req.params.courseModuleId;
        const fileId = req.params.fileId;

        //General way to verify all course route parameters are non-empty & valid!
        if (! await db.isCourseRouteValid(pool, courseId, courseTabId, courseModuleId, fileId)) {
            return res.status(500).json({error: "Invalid parameters specified!"});
        }

        //Check that user exists in database
        const userId = await db.getIdFromUsername(pool, req.session.username, req.session.role);
        if (userId === undefined) {
            return res.status(500).json({error: "Failed to find user in database!"});
        }

        //Check that user can access file
        if (! await db.isUserEnrolledInCourse(pool, userId, req.session.role, courseId)) {
            return res.status(400).json({error: "User cannot access file!"});
        }

        //Get file
        const fileData = await db.getFileData(pool, fileId);
        if (Object.keys(fileData).length === 0) {
            return res.status(404).json({error: "File not found!"});
        }

        res.setHeader('Content-Disposition', 'attachment; filename="' + fileData.file_name + '"');
        res.setHeader('Content-Type', 'application/octet-stream');
        return res.end(fileData.file_data);
    } catch (error) {
        return res.status(500).json({error: `Error while retrieving file: ${error}`});
    }
});

//Get a json object containing a course module's database information
app.get("/coursemodule/:courseModuleId", async (req,res) => {
    try {
        const courseModuleId = req.params.courseModuleId;
        const auth = {username: req.session.username, role: req.session.role};
        return res.json(await db.getCourseModule(pool, courseModuleId, auth));
    } catch (error) {
        return res.status(500).json({error: error});
    }
});

app.get("/course/:courseId/:courseTab?/:courseModuleId?", async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const courseTabId = req.params.courseTab;
        const courseModuleId = req.params.courseModuleId;
        const auth = {username: req.session.username, role: req.session.role};

        console.log(courseTabId);

        if (req.session.role === LoginType.Admin) {
            return res.status(401).json({error: "Admin role cannot access courses!"});
        }

        //Get the course information
        const courseIdQuery = await pool.query(`SELECT * FROM courses WHERE id = $1`, [courseId]);
        if (!courseIdQuery || !courseIdQuery.rows || courseIdQuery.rows.length === 0) {
            return res.status(500).render("pages/error", {
                error: "Could not find a course page for the specified course!",
                username: req.session.username,
                role: req.session.role
            });
        }

        if (courseIdQuery.length <= 0) {
            return res.status(400).json({"error": "Course does not exist!"});
        }

        const isCourseTabValid = await db.isCourseTabInValidCourse(pool, courseTabId, courseId);

        if (courseTabId && !isCourseTabValid) {
            return res.status(500).render("pages/error", {
                error: "Course tab does not exist in course!",
                username: req.session.username,
                role: req.session.role
            });
        }

        const isCourseModuleValid = await db.isCourseModuleInTab(pool, courseTabId, courseModuleId);

        if (courseTabId && courseModuleId && !isCourseModuleValid) {
            return res.status(500).json({"error": "Course module does not exist in course tab!"});
        }

        //Get the ID from the username
        const entityId = await db.getIdFromUsername(pool, req.session.username, req.session.role);

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

        if (courseModuleId) {
            const courseModule = await db.getCourseModule(pool, courseModuleId, auth);
            return res.render("pages/course_module", {
                username: req.session.username,
                role: req.session.role,
                courseModule: courseModule,
                courseTabId: courseTabId,
                courseId: courseId,
                courseTabs: courseTabsQuery.rows,
                courseModuleId: courseModuleId
            });
        }

        //If we've specified a coursetab ID, render the coursetab page instead
        if (courseTabId) {
            return res.render("pages/content_area", {
                username: req.session.username,
                role: req.session.role,
                courseTabId: courseTabId,
                courseId: courseId,
                courseTabs: courseTabsQuery.rows,
                courseModules: courseModules,
                courseTab: courseTab
            });
        }

        return res.render("pages/course", {username: req.session.username, role: req.session.role, courseId: courseId, courseTabs: courseTabsQuery.rows});
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error loading course page");
    }
});

app.get("/delete", async (req, res) => {
    try {
        const role = req.session.role;

        if (role === LoginType.Admin) {
            const admins = await db.getAllEntriesFromRole(pool, LoginType.Admin);
            const students = await db.getAllEntriesFromRole(pool, LoginType.Student);
            const teachers = await db.getAllEntriesFromRole(pool, LoginType.Teacher);

            res.render("pages/delete", {admins: admins, students: students, teachers: teachers, username: req.session.username, role: req.session.role});
        }

        return res.render("pages/login");
    } catch (error) {
        console.log(`Error in create route: ${error}`);
        return res.status(500).send("Unexpected error occurred. Please try again later!");
    }
});

app.post("/delete/file", async (req, res) => {
    try {
        const fileId = req.body.fileId;

        if (!fileId) {
            return res.status(500).json({error: "File name of file to delete is invalid!"});
        }

        //Add check to ensure file is associated with course, user is a teacher, user is enrolled in course

        if (!await db.isFileInDatabase(pool, fileId)) {
            return res.status(500).json({error: "File doesn't exist in database!"});
        }

        await pool.query(`DELETE FROM files WHERE id = $1`, [fileId]);

        return res.end();
    } catch(error){
        return res.status(500).json({error: `Failed to delete file due to error: ${error}`})
    }
});

app.post("/delete/coursemodule", async (req, res) => {
    try {
        if (req.session.role != LoginType.Teacher) {
            return res.status(400).json({error: "Role cannot delete course modules!"});
        }

        const courseModuleId = req.body.courseModuleId;
        if (!courseModuleId) {
            return res.status(500).json({error: "Course module id is invalid!"});
        }

        await pool.query(`DELETE FROM course_modules WHERE id = $1`, [courseModuleId]);

        return res.end();
    } catch(error){
        return res.status(500).json({error: `Failed to delete course module due to error: ${error}`})
    }
});

app.post("/delete/coursetab", async (req, res) => {
    try {
        if (req.session.role != LoginType.Teacher) {
            return res.status(400).json({error: "Role cannot delete course tabs!"});
        }

        const courseTabId = req.body.courseTabId;
        if (!courseTabId) {
            return res.status(500).json({error: "Course tab id is invalid!"});
        }

        const courseId = await db.getCourseIdFromCourseTab(pool, courseTabId)
        if (!courseId) {
            return res.status(500).json({error: "Could not find course id from course tab!"});
        }

        //Check if teacher is in this course
        if (! await db.isEntityInCourse(pool, req.session.username, req.session.role, courseId)) {
            return res.status(400).json({error: "Teacher is not enrolled in the required course!"});
        }

        await db.deleteCourseTab(pool, courseTabId);

        return res.end();
    } catch(error){
        return res.status(500).json({error: `Failed to delete course tab due to error: ${error}`})
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

        return res.end();
    } catch (error) {
        return res.status(500).json({error: error});
    }
}

async function createCourseModule(req, res) {
    const courseTabId = req.body.courseTabId;

    //create course module
    const courseModuleId = await db.createCourseModule(req.body, pool);

    if (courseModuleId === undefined) {
        return res.status(500).json({error: "Failed to create course module"});
    }

    //Associate the newly created course module with course tab (if specified)
    if (courseModuleId && courseTabId) {
        //Validate courseTabId
        if (await db.isCourseTabInDatabase(pool, courseTabId) === undefined) {
            return res.status(500).json({error: "Course tab does not exist in database!"});
        }

        await db.associateCourseTabAndModule(pool, courseTabId, courseModuleId);
    }

    return res.end();
}

app.post("/update/coursetab", async (req, res) => {
    try {
        const tabName = req.body.tabName;
        const courseTabId = req.body.courseTabId;

        if (!tabName || typeof tabName !== "string") {
            return res.status(400).json({error: "tabName specified is invalid!"});
        }

        if (!courseTabId || typeof courseTabId !== "string") {
            return res.status(400).json({error: "courseTabId specified is invalid!"});
        }

        auth = {username: req.session.username, role: req.session.role};

        if (! await db.updateCourseTab(pool, courseTabId, tabName, auth)) {
            return res.status(500).json({error: "Could not update course tab!"});
        }

        return res.end();
    } catch (error) {
        return res.status(500).json({error: error});
    }
});

app.post("/update/coursemodule", async (req, res) => {
    try {
        const { courseModuleId } = req.body;

        if (!courseModuleId) {
            return res.status(400).json({ error: "courseModuleId is required" });
        }

        const updated = await db.updateCourseModule(pool, courseModuleId, req.body);
        if (!updated) {
            return res.status(500).json({ error: "Failed to update course module" });
        }

        return res.json({ message: "Course module updated successfully" });
    } catch (error) {
        console.error(`Error in /update/coursemodule: ${error}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


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

            const isCourseIdValid = db.isCourseInDatabase(pool, courseId);

            if (!isCourseIdValid) {
                return res.status(400).json({error: "Course does not exist!"});
            }

            Object.entries(order).forEach(async ([courseTabId, order_id]) => {
                if (await db.isCourseTabInDatabase(pool, courseTabId)) {
                    const updateOrderQuery = await pool.query(`UPDATE course_tabs SET order_id=$1 WHERE id=$2 AND course_id=$3; `, [order_id, courseTabId, courseId]);
                    if (!updateOrderQuery) {
                        return res.status(500).json({error: "Failed to update course tab order!"});
                    }
                }
            });

            return res.send();
        }
    } catch (error) {
        return res.status(500).json({error: error});
    }
});

app.post("/create/coursetab", async (req, res) => {
    return await createCourseTab(req, res);
});

app.post("/create/coursemodule", async (req, res) => {
    return await createCourseModule(req, res);
});

app.post("/create/entity", async (req, res) => {
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

            const id = await db.getIdFromUsername(pool, username, LoginType.Student);
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

            const id = await db.getIdFromUsername(pool, username, LoginType.Teacher);
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
    } catch(error) {
        return res.status(500).json({error: `Failed to create entity due to error: ${error}`});
    }
});

app.get("/course/:courseId/:courseTabId/:courseModuleId/submissions", async (req, res) => {
    // Ensure the user is authenticated and is a student
    if (!req.session.isAuthenticated || req.session.role !== "student") {
        return res.status(403).json({ error: "Unauthorized access." });
    }

    const { courseModuleId } = req.params;

    try {
        const submissionsQuery = `
      SELECT sub.*, assign.due_date, assign.total_points, cm.title, stud.username AS student_username
      FROM submissions sub
      JOIN assignments assign ON sub.assignment_id = assign.id
      JOIN course_modules cm ON assign.module_id = cm.id
      JOIN student stud ON sub.student_id = stud.id
      WHERE cm.id = $1;
    `;

        const results = await pool.query(submissionsQuery, [courseModuleId]);

        res.json(results.rows);
    } catch (error) {
        console.error("Error querying submissions:", error);
        res.status(500).json({ error: "Internal Server Error" });
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
            return res.status(401).json({error: "Invalid username/password"});
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

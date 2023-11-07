const pg = require("pg");

async function getAllCourses(pool) {
    try {
        const coursesQuery = await pool.query(`SELECT * FROM courses`);
    } catch (error) {

    }
}

const pg = require("pg");

async function generateCourseContent(username) {
    const courses = await pool.query(`SELECT courses FROM ${userRole} WHERE username = $1`, [username]);
}
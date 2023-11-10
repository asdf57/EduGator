


async function getAllCourses(pool) {
    try {
        const userQuery = await pool.query(`SELECT * FROM courses`);
        if (userQuery.rows.length < 1)
            return [];

        return userQuery.rows;
    } catch(e) {
        console.log(`Error while obtaining all courses from database: ${e}`);
        return undefined;
    }

    //INSERT INTO courses (course_name,teacher_username,description,course_start,course_end) VALUES ('courseA','mli28','My Awesome Course','01/01/2024','07/07/2024');

}

module.exports = {
    getAllCourses
};
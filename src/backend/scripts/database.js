async function getIdFromUsername(username, role, pool) {
    try {
        const idQuery = await pool.query(`SELECT id FROM ${role} WHERE username = $1`, [username]);
        if (idQuery.rows.length < 1 || !idQuery)
            return undefined

        return idQuery.rows[0].id;
    } catch (error) {
        return undefined;
    }
}


async function getAllEntriesFromRole(pool, role) {
    try {
        console.log(`SELECT * FROM ${role}`);
        const query = await pool.query(`SELECT * FROM ${role}`);
        if (query.rows.length === 0 || !query)
            return []

        return query.rows;
    } catch (error) {
        console.log(`Error while obtaining all entries from role: ${error}`);
        return [];
    }
}

async function isCourseInDatabase(id, pool) {
    try {
        const query = await pool.query(`SELECT * FROM courses WHERE id = $1`, [id]);
        if (query.rows.length < 1 || !query)
            return false

        return true;
    } catch (error) {
        return false;
    }
}


module.exports = {
    getIdFromUsername,
    getAllEntriesFromRole,
    isCourseInDatabase
};
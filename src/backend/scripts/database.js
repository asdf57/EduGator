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



module.exports = {
    getIdFromUsername,
    getAllEntriesFromRole
};
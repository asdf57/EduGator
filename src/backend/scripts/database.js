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

async function associateCourseTabAndModule(pool, courseTabId, courseModuleId) {
    try {
        await pool.query(`INSERT INTO tab_course_module (tab_id, course_module_id) VALUES ($1, $2)`, [courseTabId, courseModuleId]);
    } catch (error) {
        console.log(`Error while associating course tab and module: ${error}`);
    }
}

async function isFileInDatabase(id, pool) {
    try {
        const query = await pool.query(`SELECT * FROM files WHERE id = $1`, [id]);
        if (query.rows.length < 1 || !query)
            return false

        return true;
    } catch (error) {
        return false;
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

async function isCourseTabInValidCourse(courseTabId, courseId, pool) {
    try {
        const query = await pool.query(`SELECT * FROM course_tabs WHERE course_id = $1 AND id = $2`, [courseId, courseTabId]);
        if (!query || !query.rows || query.rows.length === 0) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function isCourseTabInDatabase(pool, courseTabId) {
    try {
        const query = await pool.query(`SELECT * FROM course_tabs WHERE id = $1`, [courseTabId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function getCourseModule(pool, courseModuleId) {
    try {
        const moduleQuery = await pool.query(`
            SELECT *
            FROM course_modules
            WHERE id = $1`,
            [courseModuleId]
        );

        if (!moduleQuery || !moduleQuery.rows || moduleQuery.rows.length === 0) {
            return [];
        }

        const courseModule = moduleQuery.rows;

        // Fetch and attach files for module
        const fileQuery = await pool.query(`
            SELECT f.file_name, f.file_type, f.file_size 
            FROM files AS f 
            JOIN course_module_files AS cmf ON f.id = cmf.file_id 
            WHERE cmf.course_module_id = $1;`,
            [courseModuleId]
        );

        const assignmentQuery = await pool.query(`
            SELECT * FROM assignments WHERE module_id = $1`,
            [courseModuleId]
        );

        courseModule.files = fileQuery.rows;
        courseModule.assignment = assignmentQuery.rows;

        return courseModule;
    } catch (error) {
        console.log(`Error while getting course modules from course tab: ${error}`);
        return [];
    }
}

async function getCourseModulesFromTab(pool, courseTabId) {
    try {
        const moduleQuery = await pool.query(`
        SELECT *
        FROM course_modules
        WHERE id IN (
            SELECT course_module_id
            FROM tab_course_module
            WHERE tab_id = $1
        )
        ORDER BY order_id;`,
            [courseTabId]
        );

        if (!moduleQuery || !moduleQuery.rows || moduleQuery.rows.length === 0) {
            return [];
        }

        const modules = moduleQuery.rows;

        // Fetch and attach files for each module
        for (const module of modules) {
            const fileQuery = await pool.query(`
                SELECT f.file_name, f.file_type, f.file_size 
                FROM files AS f 
                JOIN course_module_files AS cmf ON f.id = cmf.file_id 
                WHERE cmf.course_module_id = $1;`,
                [module.id]
            );

            const assignmentQuery = await pool.query(`
                SELECT * FROM assignments WHERE module_id = $1`,
                [module.id]
            );

            module.files = fileQuery.rows;
            module.assignment = assignmentQuery.rows;
        }

        return modules;
    } catch (error) {
        console.log(`Error while getting course modules from course tab: ${error}`);
        return [];
    }
}

async function isCourseModuleInTab(pool, courseTabId, courseModuleId) {
    try {
        const query = await pool.query(`SELECT * FROM tab_course_module WHERE tab_id = $1 AND course_module_id = $2`, [courseTabId, courseModuleId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function createCourseModule(courseModulePayload, pool) {
    try {
        const { title, description, enableSubmissions, hasAssignment, dueDate, points, attachedFileIds }  = courseModulePayload;

        if ([title, description, enableSubmissions, hasAssignment, attachedFileIds].includes(undefined)) {
            return undefined;
        }

        //Create the course module
        const idQuery = await pool.query(`INSERT INTO course_modules (title, description, visibility) VALUES ($1, $2, $3) RETURNING id`, [title, description, true]);

        if (!idQuery || !idQuery.rows || idQuery.rows.length == 0) {
            return undefined;
        }

        //Attach files to course module
        if (Object.keys(attachedFileIds).length > 0) {
            for (const fileId of Object.values(attachedFileIds)) {
                await pool.query(`INSERT INTO course_module_files (course_module_id, file_id) VALUES ($1, $2)`, [idQuery.rows[0].id, fileId]);
            }
        }

        if (hasAssignment) {
            if ([dueDate, points].includes(undefined)) {
                return undefined;
            }

            await pool.query(`INSERT INTO assignments (module_id, due_date, total_points) VALUES ($1, $2, $3)`, [idQuery.rows[0].id, dueDate, points]);
        }

        return idQuery.rows[0].id;
    } catch (error) {
        console.log(error);
        return undefined;
    }

}


module.exports = {
    getIdFromUsername,
    getAllEntriesFromRole,
    isCourseInDatabase,
    isCourseTabInValidCourse,
    isFileInDatabase,
    isCourseTabInDatabase,
    createCourseModule,
    associateCourseTabAndModule,
    getCourseModulesFromTab,
    isCourseModuleInTab,
    getCourseModule
};
async function getIdFromUsername(pool, username, role) {
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

async function isCourseInDatabase(pool, id) {
    try {
        const query = await pool.query(`SELECT * FROM courses WHERE id = $1`, [id]);
        if (query.rows.length < 1 || !query)
            return false

        return true;
    } catch (error) {
        return false;
    }
}

async function isCourseTabInValidCourse(pool, courseTabId, courseId) {
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

        const courseModule = moduleQuery.rows[0];

        // Fetch and attach files for module
        const fileQuery = await pool.query(`
            SELECT f.file_name, f.file_type, f.file_size, f.id
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
        courseModule.assignment = assignmentQuery.rows[0];

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
                SELECT f.file_name, f.file_type, f.file_size, f.id 
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
            module.assignment = assignmentQuery.rows[0];
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
        console.log(error);
        return false;
    }
}

async function isFileInDatabase(pool, fileId) {
    try {
        const query = await pool.query(`SELECT * FROM files WHERE id = $1`, [fileId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
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

async function isFileAssociatedWithCourseModule(pool, courseModuleId, fileId) {
    try {
        const query = await pool.query(`SELECT * FROM course_module_files WHERE course_module_id = $1 AND file_id = $2`, [courseModuleId, fileId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function isUserEnrolledInCourse(pool, userId, role, courseId) {
    try {
        // Check that the student or teacher is enrolled in the course the file is located under!
        const isEnrolled = await pool.query(`SELECT * FROM ${role}_courses WHERE ${role}_id = $1 AND course_id = $2`, [userId, courseId]);
        if (!isEnrolled || !isEnrolled.rows || isEnrolled.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getFileIdFromName(pool, fileName) {
    try {
        // Check that the student or teacher is enrolled in the course!
        const query = await pool.query(`SELECT id FROM files WHERE file_name = $1`, [fileName]);
        if (!query || !query.rows || query.rows.length == 0) {
            return undefined;
        }

        return query.rows[0];
    } catch (error) {
        console.log(error);
        return undefined;
    }
}

async function isCourseValid(pool, courseId) {
    try {
        const query = await pool.query(`SELECT * FROM courses WHERE id = $1`, [courseId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function isCourseModuleInDatabase(pool, courseModuleId) {
    try {
        const query = await pool.query(`SELECT * FROM course_modules WHERE id = $1`, [courseModuleId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function isCourseRouteValid(pool, courseId, courseTabId, courseModuleId, fileId) {
    try {
        // Existence checks
        if (! await isCourseInDatabase(pool, courseId)) {
            console.log("coruse not in db");
            return false;
        }

        if (courseTabId && ! await isCourseTabInDatabase(pool, courseTabId)) {
            console.log("course tab not in db");
            return false;
        }

        if (courseModuleId && ! await isCourseModuleInDatabase(pool, courseModuleId)) {
            console.log("course module not in db");
            return false;
        }

        if (fileId && ! await isFileInDatabase(pool, fileId)) {
            console.log("file id not in db");
            return false;
        }

        // Relation checks
        if (courseTabId && ! await isCourseTabInValidCourse(pool, courseTabId, courseId)) {
            console.log("course tab not in course");
            return false;
        }

        if (courseModuleId && ! await isCourseModuleInTab(pool, courseTabId, courseModuleId)) {
            console.log("course module not in tab");
            return false;
        }

        if (fileId && ! await isFileAssociatedWithCourseModule(pool, courseModuleId, fileId)) {
            console.log("file not assciated with course module");
            return false;
        }

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getCourseIdFromCourseTab(pool, courseTabId) {
    try {
        // Check that the student or teacher is enrolled in the course!
        const query = await pool.query(`SELECT course_id FROM course_tabs WHERE id = $1`, [courseTabId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return undefined;
        }

        return query.rows[0].course_id;
    } catch (error) {
        console.log(error);
        return undefined;
    }
}

async function getFileData(pool, fileId) {
    try {
        const query = await pool.query(`SELECT * FROM files WHERE id = $1`, [fileId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return {};
        }

        return query.rows[0];
    } catch (error) {
        return {};
    }
}

async function deleteCourseTab(pool, courseTabId) {
    try {
        const res = await pool.query(`DELETE FROM course_tabs WHERE id = $1`, [courseTabId]);
        return true;
    } catch (error) {
        return false;
    }
}

async function isEntityInCourse(pool, username, role, courseId) {
    try {
        const userId = await getIdFromUsername(pool, username, role);
        const query = await pool.query(`SELECT * FROM ${role}_courses WHERE ${role}_id = $1 AND course_id = $2`, [userId, courseId]);
        if (!query || !query.rows || query.rows.length == 0) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

async function updateCourseTab(pool, courseTabId, tabName, auth) {
    try {
        if (auth.role !== 'teacher') {
            return false;
        }

        const userId = await getIdFromUsername(pool, auth.username, auth.role);
        if (!userId) {
            return false;
        }

        const courses = await getCoursesContainingCourseTab(pool, courseTabId);
        if (!courses) {
            return false;
        }

        let isAuthorized = false;
        for (const courseId of courses) {
            if (await isTeacherAssociatedWithCourse(pool, userId, courseId)) {
                isAuthorized = true;
                break;
            }
        }

        if (!isAuthorized) {
            return false;
        }

        await pool.query(`UPDATE course_tabs SET tab_name = $1 WHERE id = $2;`, [tabName, courseTabId]);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}


async function getCoursesContainingCourseTab(pool, courseTabId) {
    try {
        const res = await pool.query(`SELECT course_id FROM course_tabs WHERE id = $1;`, [courseTabId]);
        return res.rows.map(row => row.course_id);
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function isTeacherAssociatedWithCourse(pool, teacherId, courseId) {
    try {
        const res = await pool.query(`SELECT * FROM teacher_courses WHERE teacher_id = $1 AND course_id = $2;`, [teacherId, courseId]);
        return res.rowCount > 0;
    } catch (error) {
        console.error(error);
        return false;
    }
}

module.exports = {
    getIdFromUsername,
    getAllEntriesFromRole,
    isCourseInDatabase,
    isCourseTabInValidCourse,
    isCourseTabInDatabase,
    createCourseModule,
    associateCourseTabAndModule,
    getCourseModulesFromTab,
    isCourseModuleInTab,
    getCourseModule,
    getFileIdFromName,
    isFileInDatabase,
    isFileAssociatedWithCourseModule,
    isCourseValid,
    isCourseModuleInDatabase,
    isCourseRouteValid,
    isUserEnrolledInCourse,
    getFileData,
    deleteCourseTab,
    getCourseIdFromCourseTab,
    isEntityInCourse,
    updateCourseTab,
    getCoursesContainingCourseTab,
    isTeacherAssociatedWithCourse
};
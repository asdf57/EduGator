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

async function getCourseModule(pool, courseModuleId, auth) {
    try {
        // Authorization check: Ensure the user is a teacher
        if (auth.role === 'admin') {
            console.log('Unauthorized access attempt by non-teacher');
            return [];
        }

        // Get the teacher's ID from their username
        const teacherId = await getIdFromUsername(pool, auth.username, auth.role);
        if (!teacherId) {
            console.log('Could not find teacher ID for the provided username');
            return [];
        }

        // Find the course ID associated with the course module
        const courseIdQuery = await pool.query(`
            SELECT course_id
            FROM course_tabs
            JOIN tab_course_module ON course_tabs.id = tab_course_module.tab_id
            WHERE course_module_id = $1`,
            [courseModuleId]
        );

        if (courseIdQuery.rows.length === 0) {
            console.log('No course associated with the provided course module');
            return [];
        }

        const courseId = courseIdQuery.rows[0].course_id;

        // Check if the teacher is enrolled in the course
        if (!await isTeacherAssociatedWithCourse(pool, teacherId, courseId)) {
            console.log('Teacher is not associated with the course of the module');
            return [];
        }

        // Fetch the course module
        const moduleQuery = await pool.query(`
            SELECT *
            FROM course_modules
            WHERE id = $1`,
            [courseModuleId]
        );

        if (!moduleQuery || !moduleQuery.rows || moduleQuery.rows.length === 0) {
            console.log(`getCourseModule - Couldn't find course module entry with id ${courseModuleId}!`);
            return [];
        }

        const courseModule = moduleQuery.rows[0];

        // Fetch and attach files for the module
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
        console.log(`Error while getting course module: ${error}`);
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
        const { title, description, hasAssignment, dueDate, points, attachedFileIds }  = courseModulePayload;

        if ([title, description, hasAssignment, attachedFileIds].includes(undefined)) {
            console.log("createCourseModule - Missing required value: " + [title, description, hasAssignment, attachedFileIds]);
            return undefined;
        }

        //Create the course module
        const idQuery = await pool.query(`INSERT INTO course_modules (title, description, visibility) VALUES ($1, $2, $3) RETURNING id`, [title, description, true]);

        if (!idQuery || !idQuery.rows || idQuery.rows.length == 0) {
            console.log("createCourseModule - No id was returned!");
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
                console.log("createCourseModule - Assignment missing required field: " + [dueDate, points]);
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

async function updateCourseModule(pool, courseModuleId, updatePayload) {
    try {
        const { title, description, hasAssignment, dueDate, points, attachedFileIds } = updatePayload;

        if (!courseModuleId) {
            console.log("updateCourseModule - Missing courseModuleId");
            return false;
        }

        const attachedFileIdsArray = Object.values(attachedFileIds || {});

        let updateFields = [];
        let updateValues = [];
        if (title) {
            updateFields.push('title = $1');
            updateValues.push(title);
        }
        if (description) {
            updateFields.push('description = $2');
            updateValues.push(description);
        }
        if (updateFields.length > 0) {
            let updateQuery = `UPDATE course_modules SET ${updateFields.join(', ')} WHERE id = $${updateValues.length + 1}`;
            updateValues.push(courseModuleId);
            await pool.query(updateQuery, updateValues);
        }

        const assignmentExistsQuery = await pool.query(`SELECT * FROM assignments WHERE module_id = $1`, [courseModuleId]);
        const assignmentExists = assignmentExistsQuery.rows.length > 0;

        if (hasAssignment) {
            if (!assignmentExists) {
                await pool.query(`INSERT INTO assignments (module_id, due_date, total_points) VALUES ($1, $2, $3)`, [courseModuleId, dueDate, points]);
            } else {
                await pool.query(`UPDATE assignments SET due_date = $1, total_points = $2 WHERE module_id = $3`, [dueDate, points, courseModuleId]);
            }
        } else if (assignmentExists) {
            await pool.query(`DELETE FROM assignments WHERE module_id = $1`, [courseModuleId]);
        }

        console.log(attachedFileIdsArray);

        if (attachedFileIdsArray && attachedFileIdsArray.length > 0) {
            for (const fileId of attachedFileIdsArray) {
                console.log("Evaluating file " + fileId)
                if (!await isFileInDatabase(pool, fileId)) {
                    console.log(`updateCourseModule - File with ID ${fileId} does not exist`);
                    continue;
                }
                await pool.query(`INSERT INTO course_module_files (course_module_id, file_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [courseModuleId, fileId]);
            }
        }

        return true;
    } catch (error) {
        console.log(`updateCourseModule - Error: ${error}`);
        return false;
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
        // Check if course exists
        if (! await isCourseInDatabase(pool, courseId)) {
            console.log("Course not in db");
            return false;
        }

        // Check if course tab exists and is in the correct course
        if (courseTabId !== undefined && (! await isCourseTabInDatabase(pool, courseTabId) || ! await isCourseTabInValidCourse(pool, courseTabId, courseId))) {
            console.log("Course tab not in db or not in the specified course");
            return false;
        }

        // Check if course module exists and is in the correct tab (if courseTabId is provided)
        if (courseModuleId !== undefined && (! await isCourseModuleInDatabase(pool, courseModuleId) || (courseTabId !== undefined && ! await isCourseModuleInTab(pool, courseTabId, courseModuleId)))) {
            console.log("Course module not in db or not in the specified tab");
            return false;
        }

        // Check if file exists and is associated with the correct course module (if courseModuleId is provided)
        if (fileId !== undefined && (! await isFileInDatabase(pool, fileId) || (courseModuleId !== undefined && ! await isFileAssociatedWithCourseModule(pool, courseModuleId, fileId)))) {
            console.log("File not in db or not associated with the specified course module");
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

async function createFile(pool, fileData) {
    try {
        const { originalname, mimetype, size, buffer } = fileData;

        if(!originalname || !mimetype || !size || !buffer){
            return undefined;
        }

        const insertQuery = `INSERT INTO files (file_name, file_type, file_size, file_data) VALUES ($1,$2,$3,$4) RETURNING id`;
        const fileQuery = await pool.query(insertQuery, [originalname, mimetype, size, buffer]);

        if (!fileQuery || !fileQuery.rows || fileQuery.rows.length === 0) {
            return undefined;
        }

        return fileQuery.rows[0].id;
    } catch (error) {
        console.error("Error in createFile function: ", error);
        return undefined;
    }
}

async function isAssignmentInDatabase(pool, assignmentId) {
    try {
        const query = await pool.query(`SELECT * FROM assignments WHERE id = $1`, [assignmentId]);
        return query.rows.length > 0;
    } catch (error) {
        console.log(`Error in isAssignmentInDatabase: ${error}`);
        return false;
    }
}

async function isStudentInDatabase(pool, studentId) {
    try {
        const query = await pool.query(`SELECT * FROM student WHERE id = $1`, [studentId]);
        return query.rows.length > 0;
    } catch (error) {
        console.log(`Error in isStudentInDatabase: ${error}`);
        return false;
    }
}


async function associateStudentFilesToAssignment(pool, fileId, assignmentId, studentId, submissionGroupId) {
    try {
        // Ensure the file, assignment, and student exist
        if (!await isFileInDatabase(pool, fileId) || !await isAssignmentInDatabase(pool, assignmentId) || !await isStudentInDatabase(pool, studentId)) {
            console.log(`Validation failed for file, assignment, or student.`);
            return false;
        }

        // Insert the association with the submission group ID
        await pool.query(`
            INSERT INTO assignment_file_submissions (assignment_id, file_id, student_id, submission_group_id)
            VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [assignmentId, fileId, studentId, submissionGroupId]
        );
        return true;
    } catch (error) {
        console.log(`Error while associating file with student and assignment: ${error}`);
        return false;
    }
}

async function getAllStudentSubmissionsForAssignment(pool, assignmentId) {
    try {
        // First, check if the assignment exists
        const assignmentQuery = await pool.query(`SELECT * FROM assignments WHERE id = $1`, [assignmentId]);
        if (assignmentQuery.rows.length === 0) {
            console.log(`Assignment with ID ${assignmentId} does not exist.`);
            return {};
        }

        // Query to get all submissions with their files for the given assignment
        const submissionsQuery = await pool.query(`
            SELECT afs.student_id, f.id AS file_id, f.file_name, afs.submission_group_id, afs.submission_time
            FROM assignment_file_submissions afs
            JOIN files f ON afs.file_id = f.id
            WHERE afs.assignment_id = $1
            ORDER BY afs.student_id, afs.submission_group_id`,
            [assignmentId]
        );

        let submissions = {};
        submissionsQuery.rows.forEach(row => {
            const { student_id, file_id, file_name, submission_group_id, submission_time } = row;

            if (!submissions[student_id]) {
                submissions[student_id] = {};
            }

            if (!submissions[student_id][submission_group_id]) {
                submissions[student_id][submission_group_id] = {
                    submission_time: submission_time,
                    files: []
                };
            }

            submissions[student_id][submission_group_id].files.push({
                file_id: file_id,
                file_name: file_name
            });
        });

        return submissions;
    } catch (error) {
        console.log(`Error while getting all student submissions for assignment: ${error}`);
        return {};
    }
}

async function getStudentSubmissionsForAssignment(pool, assignmentId, studentId) {
    try {
        // Validate existence of the assignment and student
        if (!await isAssignmentInDatabase(pool, assignmentId) || !await isStudentInDatabase(pool, studentId)) {
            console.log(`Assignment or student does not exist.`);
            return {};
        }

        // Query to get submissions with their files for the given student and assignment
        const submissionsQuery = await pool.query(`
            SELECT afs.student_id, f.id AS file_id, f.file_name, afs.submission_group_id, afs.submission_time
            FROM assignment_file_submissions afs
            JOIN files f ON afs.file_id = f.id
            WHERE afs.assignment_id = $1 AND afs.student_id = $2
            ORDER BY afs.submission_group_id`,
            [assignmentId, studentId]
        );

        let submissions = {};
        submissionsQuery.rows.forEach(row => {
            const { file_id, file_name, submission_group_id, submission_time } = row;

            if (!submissions[submission_group_id]) {
                submissions[submission_group_id] = {
                    submission_time: submission_time,
                    files: []
                };
            }

            submissions[submission_group_id].files.push({
                file_id: file_id,
                file_name: file_name
            });
        });

        return submissions;
    } catch (error) {
        console.log(`Error while getting student submissions for assignment: ${error}`);
        return {};
    }
}

async function getAssignmentIdFromCourseModule(pool, courseModuleId) {
    try {
        const query = await pool.query(`SELECT id FROM assignments WHERE module_id = $1`, [courseModuleId]);
        if (query.rows.length > 0) {
            return query.rows[0].id;
        }
        return undefined;
    } catch (error) {
        console.log(`Error in getAssignmentIdFromCourseModule: ${error}`);
        return undefined;
    }
}

async function getSubmissionsWithFiles(pool, assignmentId) {
    const studentSubmissions = await getAllStudentSubmissionsForAssignment(pool, assignmentId);
    const files = {};

    for (const [studentId, submissionGroups] of Object.entries(studentSubmissions)) {
      files[studentId] = {};

      for (const [submissionGroupId, submissionEntry] of Object.entries(submissionGroups)) {
        files[studentId][submissionGroupId] = [];
        const fileArray = Array.isArray(submissionEntry["files"]) ? submissionEntry["files"] : [];

        for (const file of fileArray) {
          const fileData = await getFileData(pool, file.file_id);
          if (!fileData) {
            console.log(`File with ID ${file.file_id} not found.`);
            continue; // Skip to the next file if file data could not be retrieved
          }
          files[studentId][submissionGroupId].push({
            name: file.file_name,
            data: fileData.file_data, // assuming 'file_data' contains the binary content of the file
            uuid: submissionGroupId // using submissionGroupId as the identifier
          });
        }
      }
    }

    return files;
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
    isTeacherAssociatedWithCourse,
    updateCourseModule,
    createFile,
    isAssignmentInDatabase,
    isStudentInDatabase,
    associateStudentFilesToAssignment,
    getAllStudentSubmissionsForAssignment,
    getStudentSubmissionsForAssignment,
    getAssignmentIdFromCourseModule,
    getSubmissionsWithFiles
};
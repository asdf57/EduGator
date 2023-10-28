CREATE DATABASE edugators;

\c edugators;

CREATE TABLE Teacher (
    teacherId SERIAL PRIMARY KEY,
    name VARCHAR(128)
);

CREATE TABLE Course (
    courseId SERIAL PRIMARY KEY
);

-- Junction table for teacher-course relationship
CREATE TABLE TeacherCourse (
    teacherId INTEGER REFERENCES Teacher(teacherId),
    courseId INTEGER REFERENCES Course(courseId),
    PRIMARY KEY (teacherId, courseId)
);

CREATE TABLE Student (
    studentId SERIAL PRIMARY KEY,
    name VARCHAR(128),
    level VARCHAR(128),
    expectedGraduationDate DATE
);

-- Junction table for student-course relationship
CREATE TABLE StudentCourse (
    studentId INTEGER REFERENCES Student(studentId),
    courseId INTEGER REFERENCES Course(courseId),
    PRIMARY KEY (studentId, courseId)
);

CREATE TABLE ContentArea (
    contentAreaId SERIAL PRIMARY KEY,
    courseId INTEGER REFERENCES Course(courseId),
    name VARCHAR(255),
    order_index INTEGER
);

CREATE TABLE Content (
    contentId SERIAL PRIMARY KEY,
    contentAreaId INTEGER REFERENCES ContentArea(contentAreaId),
    title TEXT,
    description TEXT,
    order_index INTEGER,
    file_path TEXT
);

CREATE TABLE Assignment (
    assignmentId SERIAL PRIMARY KEY,
    courseId INTEGER REFERENCES Course(courseId),
    title TEXT,
    description TEXT
);

CREATE TABLE Submission (
    submissionId SERIAL PRIMARY KEY,
    studentId INTEGER REFERENCES Student(studentId),
    assignmentId INTEGER REFERENCES Assignment(assignmentId),
    file_path TEXT,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
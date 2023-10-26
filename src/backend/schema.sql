CREATE DATABASE edugators;
\c lab4a;

CREATE TABLE Student (
    studentId SERIAL PRIMARY KEY,
    name VARCHAR(128),
    level VARCHAR(128),
    classes class[],
    expectedGraduationDate DATE
)

CREATE TABLE Course (
    courseId SERIAL PRIMARY KEY,
    teacher teacher,
    students student[],
)

CREATE TABLE Teacher (
    teacherId SERIAL PRIMARY KEY,
    name VARCHAR(128),
    classes class[]
)

CREATE table AssignmentGroup (
    assignments assignment[]
)

CREATE table Assignment (
    title text,
    description text?,
    uploadedFiles file?,
    comletionStatus status?,
)

-- INSERT INTO animals (name, age, species) VALUES ('Test', 77, 'test');


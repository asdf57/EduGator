---CREATE DATABASE EduGator;

CREATE TYPE Academic_Year AS ENUM ('FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR');

CREATE TABLE Students (
        Student_ID SERIAL PRIMARY KEY,
        Student_Name VARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        Academic_Year Academic_Year NOT NULL,
        Expected_Graduation DATE,
        Password_Hash VARCHAR(255) NOT NULL
        );

CREATE TABLE Admin (
        Admin_ID SERIAL PRIMARY KEY,
        Admin_Name VARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        Password_Hash VARCHAR(255) NOT NULL
        );

CREATE TABLE Teachers (
        Teacher_ID SERIAL PRIMARY KEY,
        Teacher_Name VARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        Password_Hash VARCHAR(255) NOT NULL
        );

CREATE TABLE Courses (
        Course_ID SERIAL PRIMARY KEY,
        Course_Name VARCHAR(255) NOT NULL,
        Teacher_ID INT REFERENCES Teachers(Teacher_ID),
        Description VARCHAR(255),
        Course_Start DATE,
        Course_End DATE
        );

CREATE TABLE Course_Prerequisites (
        Course_ID INT REFERENCES Courses(Course_ID),
        Prerequisite_ID INT REFERENCES Courses(Course_ID),
        PRIMARY KEY (Course_ID, Prerequisite_ID)
        );

CREATE TABLE Course_Tabs (
        Tab_ID SERIAL PRIMARY KEY,
        Name VARCHAR(255) NOT NULL,
        Course_ID INT REFERENCES Courses(Course_ID),
        Visibility BOOLEAN
        );

CREATE TABLE Course_Modules (
        Module_ID SERIAL PRIMARY KEY,
        Tab_ID INT REFERENCES Course_Tabs(Tab_ID),
        Title TEXT,
        Description TEXT,
        Content JSONB,
        Visibility BOOLEAN
        );

CREATE TABLE Assignments (
        Assignment_ID SERIAL PRIMARY KEY,
        TabID INT REFERENCES Course_Tabs(Tab_ID),
        Title TEXT,
        Description TEXT,
        Due_Date DATE,
        Total_Points INT,
        Visibility BOOLEAN
        );

CREATE TABLE Submissions (
        Submission_ID SERIAL PRIMARY KEY,
        Assignment_ID INT REFERENCES Assignments(Assignment_ID),
        Student_ID INT REFERENCES Students(Student_ID),
        Submission JSONB
        );

CREATE TABLE Student_Courses (
        Student_ID INT REFERENCES Students(Student_ID),
        Course_ID INT REFERENCES Courses(Course_ID)
        );
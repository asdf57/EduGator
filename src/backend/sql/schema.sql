CREATE TYPE academic_year AS ENUM ('freshman', 'sophomore', 'junior', 'senior');

CREATE TABLE student (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        actualname VARCHAR(255) NOT NULL,
        academic_year academic_year NOT NULL,
        expected_graduation DATE,
        password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE admin (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        actualname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE teacher (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        actualname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE courses (
        id SERIAL PRIMARY KEY,
        course_name VARCHAR(255) NOT NULL,
        teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
        description VARCHAR(255),
        course_start DATE,
        course_end DATE
);

CREATE TABLE course_tabs (
        id SERIAL PRIMARY KEY,
        tab_name VARCHAR(255) NOT NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        visibility BOOLEAN
);

CREATE TABLE course_modules (
        id SERIAL PRIMARY KEY,
        tab_id INTEGER REFERENCES course_tabs(id) ON DELETE SET NULL,
        title TEXT,
        description TEXT,
        content JSONB,
        visibility BOOLEAN
);

CREATE TABLE assignments (
        id SERIAL PRIMARY KEY,
        tab_id INTEGER REFERENCES course_tabs(id) ON DELETE SET NULL,
        title TEXT,
        description TEXT,
        due_date DATE,
        total_points INT,
        visibility BOOLEAN
);

CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
        student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,
        submission JSONB
);

CREATE TABLE student_courses (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student(id) NOT NULL ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) NOT NULL ON DELETE SET NULL
);

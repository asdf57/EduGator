CREATE TYPE academic_year AS ENUM ('freshman', 'sophomore', 'junior', 'senior');

CREATE TABLE student (
        student_id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        actualname VARCHAR(255) NOT NULL,
        academic_year academic_year NOT NULL,
        expected_graduation DATE,
        password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE admin (
        admin_id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        actualname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE teacher (
        teacher_id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        actualname VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE courses (
        course_id SERIAL PRIMARY KEY,
        course_name VARCHAR(255) NOT NULL,
        teacher_username VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        course_start DATE,
        course_end DATE
);

CREATE TABLE course_prerequisites (
        course_id INT REFERENCES courses(course_id),
        prerequisite_id INT REFERENCES courses(course_id),
        PRIMARY KEY (course_id, prerequisite_id)
);

CREATE TABLE course_tabs (
        tab_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        course_id INT REFERENCES courses(course_id),
        visibility BOOLEAN
);

CREATE TABLE course_modules (
        module_id SERIAL PRIMARY KEY,
        tab_id INT REFERENCES course_tabs(tab_id),
        title TEXT,
        description TEXT,
        content JSONB,
        visibility BOOLEAN
);

CREATE TABLE assignments (
        assignment_id SERIAL PRIMARY KEY,
        tabid INT REFERENCES course_tabs(tab_id),
        title TEXT,
        description TEXT,
        due_date DATE,
        total_points INT,
        visibility BOOLEAN
);

CREATE TABLE submissions (
        submission_id SERIAL PRIMARY KEY,
        assignment_id INT REFERENCES assignments(assignment_id),
        student_id INT REFERENCES student(student_id),
        submission JSONB
);

CREATE TABLE student_courses (
        student_id INT REFERENCES student(student_id),
        course_id INT REFERENCES courses(course_id)
);

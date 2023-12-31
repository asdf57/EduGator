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
        description VARCHAR(255),
        course_start DATE,
        course_end DATE
);

CREATE TABLE course_tabs (
        id SERIAL PRIMARY KEY,
        tab_name VARCHAR(255) NOT NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        order_id INTEGER,
        visibility BOOLEAN
);

CREATE TABLE course_modules (
        id SERIAL PRIMARY KEY,
        title TEXT,
        description TEXT,
        visibility BOOLEAN,
        order_id INTEGER
);

-- Junction table for course tabs and course modules
CREATE TABLE tab_course_module (
    tab_id INTEGER REFERENCES course_tabs(id) ON DELETE CASCADE,
    course_module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    PRIMARY KEY (tab_id, course_module_id)
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    file_data BYTEA NOT NULL
);

CREATE TABLE assignments (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES course_modules(id) ON DELETE SET NULL,
        due_date DATE,
        total_points INT
);

-- Junction take for linking attached files to an assignment
CREATE TABLE course_module_files (
    course_module_id INTEGER REFERENCES course_modules(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    PRIMARY KEY (course_module_id, file_id)
);

CREATE TABLE assignment_file_submissions (
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES student(id) ON DELETE CASCADE,
    submission_group_id UUID,
    submission_time TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (assignment_id, file_id, student_id, submission_group_id)
);

CREATE TABLE submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
        student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,
        submission JSONB
);

CREATE TABLE student_courses (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL
);

CREATE TABLE teacher_courses (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES teacher(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL
);

-- Create Admin
INSERT INTO admin (username, actualname, password_hash) VALUES
('root', 'Root User', '$2a$10$MJUjNPrTd7mNJG3g15TcKugA8KaLNOKr327SF1g0Y7uT7KXF11tk2');

-- Create Students
INSERT INTO student (username, actualname,academic_year,expected_graduation,password_hash) VALUES
('testUser','User User','freshman','01/01/2024','$2a$12$nFNSWUpogmePH7Ui5YwDTeVUp4BdsQT4qyfl/epk5uiHvG5zCVTGa');
INSERT INTO student (username, actualname,academic_year,expected_graduation,password_hash) VALUES
('tester','User two','freshman','01/01/2024','$2a$12$IMp2cGT0uJ/v6BSHo5lfSerg1tNRVKK5wnrlnGKIDvsBbfNxUkTuq');
INSERT INTO student (username, actualname,academic_year,expected_graduation,password_hash) VALUES
('testUser2','User User','freshman','01/01/2024','$2a$12$nFNSWUpogmePH7Ui5YwDTeVUp4BdsQT4qyfl/epk5uiHvG5zCVTGa');

-- Create Teachers
INSERT INTO teacher (username,actualname,password_hash) VALUES ('testTeacher','Teach Teacher','$2a$12$s9Ehm.s2FDmo5ONh4Jmp/.HeTiMukNe5jXAGQRfbIWAPZNcXTZlBG');
INSERT INTO teacher (username,actualname,password_hash) VALUES ('t2','Bob','$2b$10$2UA8/YIhdjbJ05/XIcFQuuQZ/qsEWCHTSLJQRIJAqHpq6d4ZBR3Vq');

-- Create Courses
INSERT INTO courses (course_name,description,course_start,course_end) VALUES ('courseA','test','01/01/2024','07/07/2024');
INSERT INTO courses (course_name,description,course_start,course_end) VALUES ('courseB','This is another test','01/01/2024','07/07/2024');
INSERT INTO courses (course_name,description,course_start,course_end) VALUES ('courseC','test last test','03/01/2024','07/07/2024');

-- Assign Students to Courses
INSERT INTO student_courses(student_id,course_id) VALUES (1,2);
INSERT INTO student_courses(student_id,course_id) VALUES (1,1);
INSERT INTO student_courses(student_id,course_id) VALUES (2,2);
INSERT INTO student_courses(student_id,course_id) VALUES (3,2);
INSERT INTO student_courses(student_id,course_id) VALUES (3,1);

-- Assign Teachers to Courses
INSERT INTO teacher_courses(teacher_id,course_id) VALUES (1,2);
INSERT INTO teacher_courses(teacher_id,course_id) VALUES (1,2);
INSERT INTO teacher_courses(teacher_id,course_id) VALUES (1,1);
INSERT INTO teacher_courses(teacher_id,course_id) VALUES (2,1);

-- Course tab examples
INSERT INTO course_tabs (tab_name,course_id,visibility) VALUES ('Week 1', 1, TRUE);
INSERT INTO course_tabs (tab_name,course_id,visibility) VALUES ('Week 2', 1, TRUE);
INSERT INTO course_tabs (tab_name,course_id,visibility) VALUES ('Week 3', 1, TRUE);
INSERT INTO course_tabs (tab_name,course_id,visibility) VALUES ('Week 4', 1, TRUE);

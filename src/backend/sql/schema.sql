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
        student_id INTEGER REFERENCES student(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL
);

INSERT INTO student (username, actualname,academic_year,expected_graduation,password_hash) VALUES
('testUser','User User','freshman','01/01/2024','$2a$12$IMp2cGT0uJ/v6BSHo5lfSerg1tNRVKK5wnrlnGKIDvsBbfNxUkTuq');
INSERT INTO student (username, actualname,academic_year,expected_graduation,password_hash) VALUES
('tester','User two','freshman','01/01/2024','$2a$12$IMp2cGT0uJ/v6BSHo5lfSerg1tNRVKK5wnrlnGKIDvsBbfNxUkTuq');

INSERT INTO teacher (username,actualname,password_hash) VALUES ('testTeacher','Teach Teacher','$2a$12$s9Ehm.s2FDmo5ONh4Jmp/.HeTiMukNe5jXAGQRfbIWAPZNcXTZlBG');

INSERT INTO courses (course_name,teacher_id,description,course_start,course_end) VALUES ('courseA','1','test','01/01/2024','07/07/2024');
INSERT INTO courses (course_name,teacher_id,description,course_start,course_end) VALUES ('courseB','1','This is another test','01/01/2024','07/07/2024');
INSERT INTO courses (course_name,teacher_id,description,course_start,course_end) VALUES ('courseC','1','test last test','03/01/2024','07/07/2024');

INSERT INTO student_courses(student_id,course_id) VALUES ('1','2');
INSERT INTO student_courses(student_id,course_id) VALUES ('2','2');
INSERT INTO student_courses(student_id,course_id) VALUES ('1','1');
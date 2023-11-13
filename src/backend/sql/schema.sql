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
        teacher_id INT REFERENCES teacher(teacher_id),
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
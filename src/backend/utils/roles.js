const LoginType = {
	Student: "student",
	Teacher: "teacher",
	Admin: "admin"
};

function getUserType(role) {
    if (role === "student")
      return LoginType.Student;
    else if (role === "teacher")
      return LoginType.Teacher;
  
    return LoginType.Admin;
}


module.exports = {
    LoginType,
    getUserType
};
function generateSignUpPage(){
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Signup</title>
    <link rel="stylesheet" href="dist/style.css">
</head>

<body class="bg-gray-200 h-screen flex justify-center items-center">

<body class="p-10 bg-gray-100">
    <div class="container mx-auto p-8">

        <div id="signupForm" class="card p-5 bg-white">
            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Select Role</span>
                </label>
                <select id="roleSelect" class="select select-bordered w-full" onchange="toggleFields()">
                    <option value="" disabled selected>Choose a role</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                </select>
            </div>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Username</span>
                </label>
                <input id="username" type="text" placeholder="Username" class="input input-bordered w-full" name="username" required>
            </div>

            <div class="form-control mb-4">
                <label class="label">
                    <span class="label-text">Actual Name</span>
                </label>
                <input id="actual-name" type="text" placeholder="Actual Name" class="input input-bordered w-full" name="actualName" required>
            </div>

            <div id="academicYearField" class="form-control mb-4 hidden">
                <label class="label">
                    <span class="label-text">Academic Year</span>
                </label>
                <select id="academic-year" class="select select-bordered w-full" name="academicYear">
                    <option value="freshman">Freshman</option>
                    <option value="sophomore">Sophomore</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                </select>
            </div>

            <div id="graduationDateField" class="form-control mb-4 hidden">
                <label class="label">
                    <span class="label-text">Expected Graduation Date</span>
                </label>
                <input id="graduation-date" type="date" class="input input-bordered w-full" name="expectedGraduation">
            </div>

            <div class="form-control mb-6">
                <label class="label">
                    <span class="label-text">Password</span>
                </label>
                <input id="password" type="password" placeholder="Password" class="input input-bordered w-full" name="password" required>
            </div>

            <button id="signup" type="submit" class="btn btn-primary w-full">Sign up</button>
            <div id="result" class="w-full text-center"></div>
        </form>

    </div>
</body>
</html>

<script src="scripts/signup.js"></script>

</body>
</html>
`
}

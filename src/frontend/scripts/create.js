const signupButton = document.getElementById("signup");
const roleSelect = document.getElementById("roleSelect");
const usernameInput = document.getElementById("username");
const actualNameInput = document.getElementById("actual-name");
const academicYearSelect = document.getElementById("academic-year");
const graduationDateInput = document.getElementById("graduation-date");
const passwordInput = document.getElementById("password");
const resultDiv = document.getElementById("result");

signupButton.addEventListener("click", () => {
    const courseInputs = document.getElementsByName("course");

    resultDiv.textContent = "";

    const selectedCourses = []
    courseInputs.forEach((checkbox) => {
        if (checkbox.checked)
            selectedCourses.push(checkbox.value);
    });

    fetch("/create/entity", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value,
            actualName: actualNameInput.value,
            academicYear: academicYearSelect.value,
            graduationDate: graduationDateInput.value,
            courses: selectedCourses,
            role: roleSelect.value
        })
	}).then(response => {
        if (response.status === 200 && response.redirected)
			window.location.href = response.url;
		else
			return response.json();
	}).then(body => {
        if (body.hasOwnProperty("error"))
		    resultDiv.textContent = body.error;
    }).catch(error => {
        console.log(error);
    });
});

function toggleFields() {
    const academicYearField = document.getElementById('academicYearField');
    const graduationDateField = document.getElementById('graduationDateField');
    const coursesField = document.getElementById("courseField");

    if (roleSelect.value === "student") {
        academicYearField.classList.remove('hidden');
        graduationDateField.classList.remove('hidden');
        coursesField.classList.remove('hidden');
    } else if (roleSelect.value === "teacher") {
        console.log("teacher");
        academicYearField.classList.add('hidden');
        graduationDateField.classList.add('hidden');
        coursesField.classList.remove('hidden');
    } else {
        academicYearField.classList.add('hidden');
        graduationDateField.classList.add('hidden');
        coursesField.classList.add('hidden');
    }
}

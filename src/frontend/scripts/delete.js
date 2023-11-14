const deleteButton = document.getElementById("delete");
const roleSelect = document.getElementById("roleSelect");
const resultDiv = document.getElementById("result");

deleteButton.addEventListener("click", () => {
    let entities;
    if (roleSelect.value === "student"){
        entities = document.getElementsByName("student");
    } else if (roleSelect.value === "teacher"){
        entities = document.getElementsByName("teacher");
    } else if (roleSelect.value === "admin"){
        entities = document.getElementsByName("admin");
    }

    const selectedEntities = []
    entities.forEach((checkbox) => {
        if (checkbox.checked) {
            selectedEntities.push(checkbox.value);
        }
    }); 

    resultDiv.textContent = "";

    fetch("/delete", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
            usernames: selectedEntities,
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
    const adminList = document.getElementById("admins");
    const studentList = document.getElementById("students");
    const teacherList = document.getElementById("teachers");
    const entitySelection = document.getElementById("entitySelection");

    if (roleSelect.value === "student") {
        adminList.classList.add("hidden");
        teacherList.classList.add("hidden");
        studentList.classList.remove("hidden");
    } else if (roleSelect.value === "teacher") {
        adminList.classList.add("hidden");
        studentList.classList.add("hidden");
        teacherList.classList.remove("hidden");
    } else {
        studentList.classList.add("hidden");
        teacherList.classList.add("hidden");
        adminList.classList.remove("hidden");
    }
}

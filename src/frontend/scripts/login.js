const loginButton = document.getElementById("login");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const roleSelect = document.getElementById("role");
const resultDiv = document.getElementById("result");

loginButton.addEventListener("click", () => {
	fetch("/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({username: usernameInput.value, password: passwordInput.value, role: roleSelect.value})
	}).then(response => {
		console.log("Sending: ", usernameInput.value, passwordInput.value, roleSelect.value);
		if (response.status === 200) {
			if(response.redirected) {
				window.location.href = response.url;
			}
			result.textContent = "";
			
		} else {
			result.textContent = "Login failed";
		}
	});
});


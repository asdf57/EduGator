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
		if (response.status === 200 && response.redirected)
			window.location.href = response.url;
		else
			return response.json();
	}).then(body => {
		if (!body)
			return;

		 resultDiv.textContent = body.error;
	});
});


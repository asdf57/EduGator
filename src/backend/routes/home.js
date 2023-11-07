//Dynamically generates the correct home page for an admin, student, or teacher!
const generateSidebarContent = require("../utils/sidebar");

function generateHomePage(role) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LMS Dashboard</title>
    <link rel="stylesheet" href="dist/style.css">
    <link rel="stylesheet" href="node_modules/ionicons/dist/css/ionicons.min.css">
</head>

<body class="bg-gray-200 font-sans">
    <!-- Header Content -->
    <header>
        <p>Edugators</p>
        <label for="my-drawer" class="btn btn-primary drawer-button"><ion-icon name="menu-outline"></ion-icon></label>
    </header>

    <!-- Sidebar -->
    <nav class="drawer">
        <input id="my-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content absolute left-[50%] top-[50%]">
        </div>
        <div class="drawer-side">
            <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
            <ul class="menu p-4 w-80 min-h-full bg-base-100 text-base-content text-2xl font-semibold">
            <!-- Sidebar content here -->
            ${generateSidebarContent(role)}
            </ul>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="flex h-screen">

    </main>
<script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
</body>
</html>
`
}

module.exports = {
    generateHomePage
};
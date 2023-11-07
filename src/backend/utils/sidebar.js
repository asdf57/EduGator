function generateSidebarContent(role) {
    if (role === roles.LoginType.Admin) {
        return `<li><a href="/create"><ion-icon name="school-outline"></ion-icon>Create Entities</a></li>`;
    } else if (role === roles.LoginType.Teacher) {
        return `<li><a><ion-icon name="school-outline"></ion-icon>Courses</a></li>`;
    } else {
        return `<li><a href="/courses"><ion-icon name="school-outline"></ion-icon>Courses</a></li>`;
    }
}

module.exports = {
    generateSidebarContent
};

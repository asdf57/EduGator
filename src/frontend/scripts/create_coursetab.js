const addButton = document.getElementById("add");
const tabName = document.getElementById("tabname");
const courseTabs = document.getElementById("course-tabs");


addButton.addEventListener("click", async () => {
    try{
        const courseId = tabName.value;
        const payload = await fetch("/create/coursetab", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "tabName": tabName.value,
                "courseId": courseId
            })
        });

        if (!payload.ok)
         throw Exception;

        //Add to the menu
        const li = document.createElement("li");
        li.classList.add("menu-item");
        li.classList.add("mb-2");

        const a = document.createElement("a");
        a.href = "/" + tabName;

        li.appendChild(a);
        courseTabs.appendChild(li);

    } catch (error) {

    }


});
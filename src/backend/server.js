let express = require("express");

const hostname = "0.0.0.0";
const port = process.env.PORT;
const app = express();

app.get("/", (req,res) => {
  res.send("Hello, World!");
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});

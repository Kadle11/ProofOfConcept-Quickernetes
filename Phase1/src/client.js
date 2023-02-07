const express = require('express');
const process = require('process')
const request = require('request');

const SERVER_ADDR = process.argv[2]

const app = express();
app.use(express.json());

app.get("/student/:roll", async (req, res) => {
    request('http://' + SERVER_ADDR + '/student/' + req.params.roll, { json: true }, (err, resp, body) => {
        let student = { name: body.name, registration: body.registration, roll: body.roll }
        res.status(200).json(student)
    })
})

app.listen(4000, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started Server on 4000");
})

const MONGO_URL = "mongodb://mongo:27017";
const Student = require('./student_schema.js');

const mongoose = require('mongoose');
const express = require('express');


mongoose.connect(MONGO_URL, { useNewUrlParser: true });
const conn = mongoose.connection;
try {
    conn.on('open', () => {
        console.log('Connected to database');
    })
} catch (error) {
    console.log("Error: " + error);
}

const app = express();

app.get("/student/:roll", async (req, res) => {

    //console.log(req.protocol)

    let result = await Student.findOne({ roll: req.params.roll });
    let student = { name: result.name, registration: result.registration, roll: result.roll }

    // res.header('Connection', "keep-alive")
    res.set("Keep-Alive", "timeout=5, max=0");
    res.status(200).json(student);
    

})

var server = app.listen(3000, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started Server on 7000");
})
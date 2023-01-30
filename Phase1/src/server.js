const Student = require('./student_schema.js');

const mongoose = require('mongoose');
const express = require('express');
const process = require('process');

const MONGO_URL = 'mongodb://' + process.argv[2] + ':27017';



mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const conn = mongoose.connection;
try {
    conn.on('open', () => {
        console.log('Connected to database');
    })
} catch (error) {
    console.log("Error: " + error);
}

const app = express();
app.use(express.json());

app.get("/student/:roll", async (req, res) => {

    //console.log(req.protocol)

    let result = await Student.findOne({ roll: req.params.roll });
    let student = { name: result.name, registration: result.registration, roll: result.roll }

    // res.header('Connection', "keep-alive")
    // res.set("Keep-Alive", "timeout=5, max=0");
    res.status(200).json(student);


})

app.post("/student", async (req, res) => {

    const newstudent = new Student({
        name: req.body.name,
        roll: req.body.roll,
        registration: req.body.registration,
    })

    try {
        await newstudent.save();
        console.log("[Record Inserted]", newstudent.name);
        res.status(201).send()
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

var server = app.listen(3000, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started Server on 3000");
})

const Student = require('./student_schema.js');

const mongoose = require('mongoose');
const express = require('express');
const process = require('process');

const port = process.length >= 4 ? process.argv[3] : '27017';
const MONGO_URL = `mongodb://${process.argv[2]}:${port}`;

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
    const startFn = process.hrtime.bigint();
    //console.log(req.protocol)

    const startLu = process.hrtime.bigint();
    let result = await Student.findOne({ roll: req.params.roll });
    const endLu = process.hrtime.bigint();
    console.log(`2,${endLu - startLu}`)
    let student = { name: result.name, registration: result.registration, roll: result.roll }

    // res.header('Connection', "keep-alive")
    // res.set("Keep-Alive", "timeout=5, max=0");
    res.status(200).json(student);
    const endFn = process.hrtime.bigint();
    console.log(`1,${endFn - startFn}`)
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

const PROTO_PATH = './students.proto'
const Student = require('./student_schema.js');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const express = require('express');
const process = require('process');
const opentelemetry = require("@opentelemetry/api");

const tracer = require('./trace')(('grpc-tunnel-server'));
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

    let result = await Student.findOne({ roll: req.params.roll });
    span1.end()

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

// Suggested options for similarity to existing grpc.load behavior
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// The protoDescriptor object has the full package hierarchy
const students = protoDescriptor.students;

const Server = new grpc.Server();
Server.addService(students.StudentLookup.service, {
    addStudent: addStudent,
    streamStudent: streamStudent
})

async function streamStudent(call) {

    call.on("data", async function (roll) {
        //console.log("Request for", roll, "recieved at", Date.now())

        ctxObj = JSON.parse(roll.traceObj);
        const ctx = opentelemetry.propagation.extract(opentelemetry.ROOT_CONTEXT, ctxObj)

        const span1 = tracer.startSpan('server.js:mongo()', { kind: 1 }, ctx)
        let result = await Student.findOne({ roll: roll.roll });
        span1.end()

        const span2 = tracer.startSpan('gRPCServerStream:write()', { kind: 1 }, ctx)

        let student = { name: result.name, registration: result.registration, roll: result.roll }
        call.write(student);
        span2.end()
    })

    call.on("error", () => {

    })

    call.on("end", () => {

    })
}

async function addStudent(call, callback) {

    const newstudent = new Student({
        name: call.request.name,
        roll: call.request.roll,
        registration: call.request.registration,
    })

    try {
        await newstudent.save();
        console.log("[Record Inserted]", newstudent.name);
        res.status(201).send()
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }

    console.log("[Record Inserted]", call.request.name);
    callback(null);
}

Server.bindAsync("0.0.0.0:7000", grpc.ServerCredentials.createInsecure(), () => {
    Server.start();
});

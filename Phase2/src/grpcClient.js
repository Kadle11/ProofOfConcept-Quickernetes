const PROTO_PATH = './students.proto'
const SERVER_ADDR = 'localhost:7000'

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');

const serverPackageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });

const serverProtoDescriptor = grpc.loadPackageDefinition(serverPackageDefinition);

// The protoDescriptor object has the full package hierarchy
const students = serverProtoDescriptor.students;
const client = new students.StudentLookup(SERVER_ADDR, grpc.credentials.createInsecure());

const studentStream = client.streamStudent()

const app = express();
app.use(express.json());

app.get("/student/:roll", async (req, res) => {

    //console.log(req.params.roll)
    studentStream.write({"roll":req.params.roll})
    studentStream.on("data", async (student) => {
        if (student.roll == req.params.roll) {
            res.status(200).json(student)
        }
    })

    studentStream.on("error", async => {
    })

    studentStream.on("end", async => {
    })
})

app.post("/student", async (req, res) => {

    var student = {};
    student.name = req.body.name;
    student.registration = req.body.registration;
    student.roll = req.body.roll;

    await client.addStudent(student, function (err) {
        if (err) {
            if (err.details.includes('E11000')) {
                console.log("[InsertionError] Duplicate Key Error")
                res.sendStatus(400);
            }
            else {
                res.sendStatus(500);
            }
        } else {
            res.sendStatus(201);
        }
    });
})

var server = app.listen(3000, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started Server on 3000");
})
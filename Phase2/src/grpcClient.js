const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const EventEmitter = require('node:events');
const process = require('process')
const opentelemetry = require("@opentelemetry/api");

const PROTO_PATH = './students.proto'
const SERVER_ADDR = process.argv[2]

// console.log("Server Address: ", SERVER_ADDR)

const tracer = require('./trace')(('grpc-tunnel-client'));


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

const responseListener = new EventEmitter();

studentStream.on("data", async function (student) {
    responseListener.emit(student.roll, student)
})

studentStream.on("error", async => {
})

studentStream.on("end", async => {
})

app.get("/student/:roll", async (req, res) => {
    // console.log("Recieved request from client for student", req.params.roll)
    const span = tracer.startSpan('client.js:GET()');
    // console.log(span)
    const requestCtx = opentelemetry.trace.setSpan(opentelemetry.context.active(), span)
    opentelemetry.context.with(requestCtx, () => {
        const ctx = opentelemetry.context.active()

        ctxObj = {}
        opentelemetry.propagation.inject(requestCtx, ctxObj)
        ctxObjStr = JSON.stringify(ctxObj)

        const span1 = tracer.startSpan('gRPCClientStream:write()', { kind: 2 }, ctx)
        span.addEvent('QueryData --> Stream')
        studentStream.write({ "roll": req.params.roll, "traceObj": ctxObjStr })
        span1.end()

        responseListener.once(req.params.roll, async function (student) {
            res.status(200).json(student)
            span.addEvent('Stream --> ResponseData')
            span.end()
        })
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

var server = app.listen(8080, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started Server on 3000");
})

const express = require('express');
const EventEmitter = require('node:events');
const process = require('process')
const opentelemetry = require("@opentelemetry/api");
const WebSocket = require('ws');

const SERVER_ADDR = process.argv[2]
const tracer = require('./trace')(('grpc-tunnel-client'));

const app = express();
app.use(express.json());

const ws = new WebSocket('ws://' + SERVER_ADDR, {
    perMessageDeflate: false
});

const responseListener = new EventEmitter();

ws.on('error', console.error);

ws.on('message', async function (data) {

    let student = JSON.parse(data)
    responseListener.emit(student.roll, student)

})

app.get("/student/:roll", async (req, res) => {
    // console.log("Recieved request from client for student", req.params.roll)

    // const span = tracer.startSpan('client.js:GET()');
    // const requestCtx = opentelemetry.trace.setSpan(opentelemetry.context.active(), span)
    // opentelemetry.context.with(requestCtx, () => {
    // })

    ws.send(req.params.roll)

    responseListener.once(req.params.roll, async function (student) {
        res.status(200).json(student)
    })


})

app.post("/student", async (req, res) => {

    var student = {};
    student.name = req.body.name;
    student.registration = req.body.registration;
    student.roll = req.body.roll;

})

var server = app.listen(3000, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started Server on 3000");
})

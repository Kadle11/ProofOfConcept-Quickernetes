const express = require('express');
const EventEmitter = require('node:events');
const process = require('process')
const opentelemetry = require("@opentelemetry/api");
const WebSocket = require('ws');

const SERVER_ADDR = process.argv[2]
const tracer = require('./trace')(('grpc-tunnel-client'));

const ws_app = express();
ws_app.use(express.json());

const ws = new WebSocket('ws://' + SERVER_ADDR, {
    perMessageDeflate: false
});

const responseListener = new EventEmitter();

ws.on('error', console.error);

ws.on('message', async function (data) {

    let student = JSON.parse(data)
    responseListener.emit(student.roll, student)

})

ws_app.get("/student/:roll", async (req, res) => {

    ws.send(req.params.roll)

    responseListener.once(req.params.roll, async function (student) {
        res.status(200).json(student)
    })


})

ws_app.post("/student", async (req, res) => {

    var student = {};
    student.name = req.body.name;
    student.registration = req.body.registration;
    student.roll = req.body.roll;

})

ws_app.listen(3000, "0.0.0.0", function (err) {
    if (err) {
        console.log("[Error] Unable to start server.");
    }
    console.log("Started WS Server on 3000");
})

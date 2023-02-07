const WebSocket = require('ws');
const request = require('request');

const webSocketServer = new WebSocket.WebSocketServer({ port: 8080 })

webSocketServer.on('connection', function connection(ws) {

    console.log('Connection Estd')

    ws.on('message', async function message(data) {

        request('http://localhost:3000/student/' + data, { json: true }, (err, res, body) => {
            let student = { name: body.name, registration: body.registration, roll: body.roll }
            let strData = JSON.stringify(student)

            ws.send(strData)
        })
    })

    ws.on('error', console.error);

    ws.on('close', function () {
        console.log("The socket has been closed")
    });
})
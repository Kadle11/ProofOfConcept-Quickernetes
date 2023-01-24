const PROTO_PATH = './students.proto'

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const axios = require('axios');

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

    call.on("data", async function(roll) {
        //console.log("Request for", roll, "recieved at", Date.now())
        axios.get('http://node2:32000/student/' + roll.roll)
            .then(response => {
                console.log(response.data)
                let student = { name: response.data.name, registration: response.data.registration, roll: response.data.roll }
                call.write(student);
            }).catch(error => {
                console.log(error);
                call.write('Error : Unable to find student');
            });
    })

    call.on("error", () => {

    })

    call.on("end", () => {

    })
}

async function addStudent(call, callback) {

    const student = JSON.stringify({
        name: call.request.name,
        roll: call.request.roll,
        registration: call.request.registration,
    })

    var config = {
        method: 'post',
        url: 'http://node1:32000/student',
        headers: {
            'Content-Type': 'application/json'
        },
        data: student
    };

    axios(config)
        .then(function (response) {
            console.log(JSON.stringify(response.
                data));
        })
        .catch(function (error) {
            console.log(error);
        });

    console.log("[Record Inserted]", call.request.name);
    callback(null);
}

Server.bindAsync("0.0.0.0:7000", grpc.ServerCredentials.createInsecure(), () => {
    Server.start();
});

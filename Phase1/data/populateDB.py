import requests
import csv
import json
from random import sample

# defining the api-endpoint
# API_ENDPOINT = "http://localhost:8001/api/v1/proxy/namespaces/default/services/mongo:3000/student"
API_ENDPOINT = "http://localhost:3000/student"

subjectList = ['Computer Science', 'Math',
               'English', 'Chemistry', 'Physics', 'Biology']

headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}

with open("./data.csv") as csvFile:
    reader = csv.reader(csvFile, delimiter=',')
    headerLine = True
    rollCall = 1
    for row in reader:
        if (headerLine):
            headerLine = False
        else:
            data = {
                'name': row[1] + " " + row[2],
                'roll': rollCall,
                'registration': row[1][0] + row[2] + str(rollCall),
                'subjects': sample(subjectList, 3)}
            r = requests.post(url=API_ENDPOINT, data=json.dumps(data), headers=headers)
            rollCall = rollCall + 1

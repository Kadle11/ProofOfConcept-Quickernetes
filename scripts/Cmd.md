## Setup Database

cd Phase1/data

### Open file and change IP to the web service's IP
kubectl get svc
python3 populateDB.py

## Run Wkld
cd Phase1/wkld

### Find Throughput
./wrk/wrk -c 10 -t 10 -d 60s -s basic-get-wkld.lua http://<web-service-IP>/student

### Latency Profile
./wrk2/wrk -c 10 -t 10 -d 60s -R <Throughput +/- 50> -s basic-get-wkld.lua http://<web-service-IP>/student



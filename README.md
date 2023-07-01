# DeathStarBench Setup and Workloads

## CloudLab Config Requirements

While configuring the CloudLab experiment for DeathStarBench (DSB), you'll need to alloacte at least 2 nodes. 
_This script has been tested for a 3 node setup._

While *Parametrizing* the experiment, the following changes need to be made -
- Parameterize --> Select OS Image : Ubuntu 20.04
- Parameterize --> Advanced --> Temporary Filesystem Size : Allocate to 100 (Minimum)
- Parameterize --> Advanced --> Temporary Filesystem Mount Point  : /data

Make other changes if necessary and finish provisioning the cluster.

## DeathStarBench Initialization

```
./scripts/cluster.sh -u <CloudLab Username> -h <Host1>,<Host2> ... ,<Host N>
./scripts/cluster.sh -u vrao79 -h clnode062.clemson.cloudlab.us,clnode048.clemson.cloudlab.us,clnode078.clemson.cloudlab.us
```
This Script does the following -
1. Install Docker and K8s.
2. Initialize the K8s cluster.
3. Install/Setup the Prerequisites for DSB 
4. Install the Workload Generators (Wrk and Wrk2)
5. Install Helm
6. Initialiaze DSB's Social Network Application
7. Populate the Application with a Social Network DB.
8. Reconfigure the workload scripts for the current cluster.


## Running the Workload Scripts

[Wrk](https://github.com/wg/wrk) and [Wrk2](https://github.com/giltene/wrk2) and the load generators we can use. 
They take customized lua scripts as inputs and simulate the workload and randomize input to the workload.

To Run the Compose-Post workload with Wrk, 
```
DEATHSTAR_HOME/wrk/wrk -D exp -t <num-threads> -c <num-conns> -d <duration>  -s DEATHSTAR_HOME/socialNetwork/wrk2/scripts/social-network/compose-post.lua http://<NGINX LOAD BALANCER IP>/wrk2-api/post/compose
```

To find the Nginx Load Balancer IP Run - `kubectl get svc | grep nginx-thrift | awk '{print $3}'`

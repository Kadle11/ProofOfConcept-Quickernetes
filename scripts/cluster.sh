#!/bin/bash
set -x
set -e

# Check that the script has two arguments
while getopts ":h:u:s:" opt; do
  case ${opt} in
  u)
    user="${OPTARG}"
    ;;
  h)
    hostnames_comma="${OPTARG}"
    ;;
  s)
    autoscale=true
    ;;
  \?)
    echo "Invalid option: -$OPTARG" 1>&2
    exit 1
    ;;
  :)
    echo "Option -$OPTARG requires an argument." 1>&2
    exit 1
    ;;
  esac
done

if [[ -z "${user}" ]] || [[ -z "${hostnames_comma}" ]]; then
  echo "Usage: $0 -u <user> -h <hostnames>" 1>&2
  exit 1
fi

# Extract the user and hostname from the command-line argument
# node="${hostname%%.*}"
IFS=',' read -r -a hostnames <<<"$hostnames_comma"
for machine in "${hostnames[@]}"; do
  ssh-keyscan "$machine" >> $HOME/.ssh/known_hosts
  hostname=$(ssh "${user}@${machine}" "hostname")
  if [[ $hostname == *"node0"* ]]; then
    master=$machine
  else
    workers+=($machine)
  fi
done

# Print the results
echo "User: $user"
echo "Hostname: ${hostnames[@]}"
echo "Master: ${master}"
echo "Workers: ${workers[@]}"
# echo "Node: $node"

# Install Docker
for machine in ${hostnames[@]}; do
  ssh "${user}@${machine}" "curl https://gist.githubusercontent.com/vthurimella/6737b905be2953e2c420389f24d63f01/raw/f09e39c109d22a948b6b3608168477ded0087ef9/docker.sh > docker.sh"
  ssh "${user}@${machine}" "chmod +x docker.sh"
  ssh "${user}@${machine}" "sudo ./docker.sh ${user}" &
done

wait

# Install Kubernetes and create a cluster.
ssh "${user}@${master}" "curl https://gist.githubusercontent.com/vthurimella/977515d3dcd084b47211b12bf38798f3/raw/aea712bd16c00a3a2f74291ade68ccd452eae9d5/k8s.sh > k8s.sh"
ssh "${user}@${master}" "chmod +x k8s.sh"
join_cmd=$(ssh "${user}@${master}" "sudo ./k8s.sh master ${#workers[@]}" | grep "Join Command:" | cut -d ':' -f 2- | xargs)

for worker in "${workers[@]}"; do
  ssh "${user}@${worker}" "curl https://gist.githubusercontent.com/vthurimella/977515d3dcd084b47211b12bf38798f3/raw/aea712bd16c00a3a2f74291ade68ccd452eae9d5/k8s.sh > k8s.sh"
  ssh "${user}@${worker}" "chmod +x k8s.sh"
  ssh "${user}@${worker}" "sudo ./k8s.sh worker \"$join_cmd\"" &
done

wait

ssh "${user}@${master}" "sudo chown -R ${user} /users/${user}/.kube"

# Install Flannel
ssh "${user}@${master}" "kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml"

# Disable Strict ARP for Metal-LB
ssh "${user}@${master}" "kubectl get configmap kube-proxy -n kube-system -o yaml | sed -e 's/strictARP: false/strictARP: true/' | kubectl apply -f - -n kube-system"

# Get the Quickernetes Repository
ssh "${user}@${master}" "[ ! -d ProofOfConcept-Quickernetes ] && git clone https://github.com/Kadle11/ProofOfConcept-Quickernetes.git"
ssh "${user}@${master}" "cd ProofOfConcept-Quickernetes; git submodule init; git submodule update"

# Install Pre-Reqs for Load Generators
ssh "${user}@${master}" "sudo apt-get install -y libssl-dev libz-dev luarocks"
ssh "${user}@${master}" "sudo luarocks install luasocket"
ssh "${user}@${master}" "sudo apt-get install -y python3-pip"
ssh "${user}@${master}" "sudo pip3 install asyncio aiohttp"

# Install Load Generators (Wrk and Wrk2)
ssh "${user}@${master}" "cd /users/${user}/ProofOfConcept-Quickernetes/Phase1/wkld/wrk; make -j"
ssh "${user}@${master}" "cd /users/${user}/ProofOfConcept-Quickernetes/Phase1/wkld/wrk2; make -j"

# Install Metal-LB
ssh "${user}@${master}" "kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.9/config/manifests/metallb-native.yaml"
sleep 30
ssh "${user}@${master}" "kubectl apply -f /users/${user}/ProofOfConcept-Quickernetes/metal-lb/"

# Install Metrics Server
ssh "${user}@${master}" "kubectl apply -f /users/${user}/ProofOfConcept-Quickernetes/metrics-server-components.yaml"

# Install Helm
ssh "${user}@${master}" "curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3"
ssh "${user}@${master}" "chmod 700 get_helm.sh"
ssh "${user}@${master}" "./get_helm.sh"

# Get DeathStarBench
ssh "${user}@${master}" "git clone https://github.com/delimitrou/DeathStarBench.git"
ssh "${user}@${master}" "cd /users/${user}/DeathStarBench; git checkout tags/socialNetwork-0.0.14"
ssh "${user}@${master}" "cp -r /users/${user}/ProofOfConcept-Quickernetes/Phase1/wkld/wrk /users/${user}/DeathStarBench"
ssh "${user}@${master}" "cp -r /users/${user}/ProofOfConcept-Quickernetes/Phase1/wkld/wrk2 /users/${user}/DeathStarBench"

# Initialize the Social Network Application
# Setup ReadMe : https://github.com/delimitrou/DeathStarBench/tree/socialNetwork-0.0.14/socialNetwork/helm-chart
ssh "${user}@${master}" "helm install socialnetwork /users/${user}/DeathStarBench/socialNetwork/helm-chart/socialnetwork"
sleep 30

NGINX_IP=`ssh ${user}@${master} "kubectl get svc | grep nginx-thrift" | awk '{print $3}'` # Get the IP of the nginx-thrift service
ssh "${user}@${master}" "cd /users/${user}/DeathStarBench/socialNetwork/; python3 scripts/init_social_graph.py --ip ${NGINX_IP}" # Initialize the database (Social Network Graph)

# Replace the wrk2 scripts' IP addrs with the current IP.
ssh "${user}@${master}" "cd /users/${user}/DeathStarBench/socialNetwork/; sed -i 's/localhost/${NGINX_IP}/g' wrk2/scripts/social-network/*.lua"
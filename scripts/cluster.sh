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

for machine in ${hostnames[@]}; do
  ssh "${user}@${machine}" "curl https://gist.githubusercontent.com/vthurimella/6737b905be2953e2c420389f24d63f01/raw/f09e39c109d22a948b6b3608168477ded0087ef9/docker.sh > docker.sh"
  ssh "${user}@${machine}" "chmod +x docker.sh"
  ssh "${user}@${machine}" "sudo ./docker.sh ${user}" &
done

wait

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

ssh "${user}@${master}" "kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml"

# Actually apply the changes, returns nonzero returncode on errors only
ssh "${user}@${master}" "kubectl get configmap kube-proxy -n kube-system -o yaml | sed -e 's/strictARP: false/strictARP: true/' | kubectl apply -f - -n kube-system"

# Get the Quickernetes Repository

ssh "${user}@${master}" "[ ! -d ProofOfConcept-Quickernetes ] && git clone https://github.com/Kadle11/ProofOfConcept-Quickernetes.git"

ssh "${user}@${master}" "cd ProofOfConcept-Quickernetes; git submodule init; git submodule update"

ssh "${user}@${master}" "sudo apt-get install -y libssl-dev libz-dev luarocks"
ssh "${user}@${master}" "sudo luarocks install luasocket"

ssh "${user}@${master}" "cd /users/${user}/ProofOfConcept-Quickernetes/Phase1/wkld/wrk; make -j"
ssh "${user}@${master}" "cd /users/${user}/ProofOfConcept-Quickernetes/Phase1/wkld/wrk2; make -j"

ssh "${user}@${master}" "kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.9/config/manifests/metallb-native.yaml"
sleep 30

ssh "${user}@${master}" "kubectl apply -f /users/${user}/ProofOfConcept-Quickernetes/metal-lb/"

ssh "${user}@${master}" "kubectl apply -f /users/${user}/ProofOfConcept-Quickernetes/metrics-server-components.yaml"

if [[ $autoscale == true ]]; then
  ssh "${user}@${master}" "kubectl apply -f /users/${user}/ProofOfConcept-Quickernetes/Phase1/k8s-setup/"
else
  ssh "${user}@${master}" "kubectl apply -f /users/${user}/ProofOfConcept-Quickernetes/Phase1/k8s-setup/"
  ssh "${user}@${master}" "kubectl delete -f /users/${user}/ProofOfConcept-Quickernetes/Phase1/k8s-setup/client-hpa.yaml"
  ssh "${user}@${master}" "kubectl delete -f /users/${user}/ProofOfConcept-Quickernetes/Phase1/k8s-setup/server-hpa.yaml"
fi

#!/bin/bash
set -x
set -e

# Check that the script has two arguments
while getopts ":h:u:" opt; do
  case ${opt} in
  u)
    user="${OPTARG}"
    ;;
  h)
    hostnames_comma="${OPTARG}"
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

ssh "${user}@${master}" "curl https://gist.githubusercontent.com/vthurimella/977515d3dcd084b47211b12bf38798f3/raw/a9602d5008217c43db83ef114978de587a0e6a6a/k8s.sh > k8s.sh"
ssh "${user}@${master}" "chmod +x k8s.sh"
ssh "${user}@${master}" "sudo ./k8s.sh master ${#workers[@]}" &

for worker in "${workers[@]}"; do
  ssh "${user}@${worker}" "curl https://gist.githubusercontent.com/vthurimella/977515d3dcd084b47211b12bf38798f3/raw/a9602d5008217c43db83ef114978de587a0e6a6a/k8s.sh > k8s.sh"
  ssh "${user}@${worker}" "chmod +x k8s.sh"
  ssh "${user}@${worker}" "sudo ./k8s.sh" &
done

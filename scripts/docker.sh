#!/bin/bash


if [ "$#" -ne 1 ]; then
  echo "./docker.sh [user]"
  exit 1
fi

ssh_user=$1

apt-get remove docker docker-engine docker.io containerd runc
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release socat
mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --yes --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

groupadd docker
usermod -aG docker "${ssh_user}"

echo '{"data-root": "/data/docker"}' >> /etc/docker/daemon.json
service docker restart

sed -i 's/disabled_plugins/# disabled_plugins/g' /etc/containerd/config.toml
service containerd restart
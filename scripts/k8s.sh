#!/bin/bash


# Add kubernetes sources to apt
apt-get install -y apt-transport-https curl
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add
echo "deb https://apt.kubernetes.io/ kubernetes-xenial main" >>~/kubernetes.list
mv ~/kubernetes.list /etc/apt/sources.list.d
apt-get update

# Install kubernetes
apt-get install -y kubelet kubeadm kubectl kubernetes-cni

# Disable swap
swapoff -a

# Set node name
domain=$(hostname)
node_name=${domain%%.*}
hostnamectl set-hostname "${node_name}"
echo "set hostname to ${node_name}"

if [[ $1 == "master" ]]; then
  # Initialize kubernetes
  kubeadm init --pod-network-cidr=10.244.0.0/16

  # Use kubeadm to generate a token and get the discovery hash
  cmd=$(kubeadm token create --print-join-command)

  for i in {1..$2}; do
    while ! echo "${cmd}" | socat TCP:node$i:1234 -; do
      echo "Waiting for node$i to be ready"
      sleep 5
    done
  done

  mkdir -p $HOME/.kube
  cp /etc/kubernetes/admin.conf $HOME/.kube/config
  chown $(id -u):$(id -g) $HOME/.kube/config
else
  socat TCP-LISTEN:1234 - | bash
fi

# Install flannel
# sudo kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

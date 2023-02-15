#!/bin/bash

kubectl delete -f ws-server-controller.yaml
kubectl create -f ws-server-controller.yaml
kubectl delete -f ws-client-controller.yaml
kubectl create -f ws-client-controller.yaml

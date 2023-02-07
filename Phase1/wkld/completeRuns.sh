#!/bin/bash

for i in {1..3}
do
    ./wrk2/wrk -t 10 -c 10 -d 10m -R 500 -s basic-get-wkld.lua -L http://node2:31500/student > logs/Baseline-Run$i.log;
done

userinput=""
echo "Switch Impls"
# read a single character
while read -r -n1 key
do
# if input == ESC key
if [[ $key == $'\e' ]];
then
break;
fi
# Add the key to the variable which is pressed by the user.
done

for i in {1..3}
do
    ./wrk2/wrk -t 10 -c 10 -d 10m -R 500 -s basic-get-wkld.lua -L http://node2:31500/student > logs/WS-Run$i.log;
done


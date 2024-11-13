#!/bin/bash

# tc qdisc add dev eth0 root netem delay 200ms loss 10% rate 10kbps
tc qdisc add dev eth0 root tbf rate 200kbps burst 64kbit latency 200ms

npm run start

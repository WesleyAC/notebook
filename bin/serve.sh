#!/bin/sh

cd "$(dirname "$0")"/.. || exit

(cd ./out/site && python3 -m http.server) &
SERVER_PID=$!
trap 'kill $SERVER_PID; exit' INT

while true
do
	find . ! -name 'out' | entr ./bin/build/build.py
done

#!/bin/sh

cd "$(dirname "$0")"/.. || exit

(cd ./out/site && python3 -m http.server) &

while true
do
	find . ! -name 'out' | entr ./bin/build/build.py
done

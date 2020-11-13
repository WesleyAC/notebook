#!/bin/sh

cd "$(dirname "$0")"/.. || exit

(cd ./out/site && python3 -m http.server) &

while [ 1 ]
do
	find . ! -name 'out' | entr ./bin/build/build.py
done

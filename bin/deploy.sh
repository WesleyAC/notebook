#!/usr/bin/env bash

set -e

START_TIME=$SECONDS

while test $# != 0
do
    case "$1" in
    --yolo) YOLO_MODE=t ;;
    *) exit 1 ;;
    esac
    shift
done

cd "$(dirname "$0")"/.. || exit

if [ -n "$(git status --porcelain)" ]; then
	echo "working directory not clean, exiting." 
	exit 1
fi

if ! git diff --exit-code > /dev/null; then
	echo "working directory not clean, exiting." 
	exit 1
fi

echo "switching to gh-pages branch..."
if git branch | grep -q gh-pages
then
	git branch -D gh-pages &> /dev/null
fi
git checkout -b gh-pages &> /dev/null
trap "git checkout - &> /dev/null" EXIT

echo "building site..."
./bin/build/build.py
if [[ "$YOLO_MODE" ]]; then
    echo "skipping validation..."
else
    echo "validating site..."
    ./bin/validate.sh
fi

find . -maxdepth 1 ! -name '.' ! -name 'out' ! -name '.git' ! -name '.gitignore' ! -name 'node_modules' ! -name 'static' -exec rm -rf {} \;
find ./static -maxdepth 1 ! -wholename './static' ! -name 'fonts' -exec rm -rf {} \;
cp -r out/site/* .

echo "committing compiled site..."
git add -A > /dev/null
git commit --allow-empty -m "$(git log -1 --pretty=%B)" > /dev/null
echo "pushing compiled site..."
git push -f -q origin gh-pages > /dev/null

echo "deployed <3"

ELAPSED_TIME=$((SECONDS - START_TIME))
echo "$((ELAPSED_TIME/60)) min $((ELAPSED_TIME%60)) sec"    


#!/usr/bin/env bash

set -e

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
echo "validating site..."
./bin/validate.sh

find . -maxdepth 1 ! -name '.' ! -name 'out' ! -name '.git' ! -name '.gitignore' ! -name 'node_modules' ! -name 'static' -exec rm -rf {} \;
find ./static -maxdepth 1 ! -wholename './static' ! -name 'fonts' -exec rm -rf {} \;
cp -r out/site/* .

echo "committing compiled site..."
git add -A > /dev/null
git commit --allow-empty -m "$(git log -1 --pretty=%B)" > /dev/null
echo "pushing compiled site..."
git push -f -q origin gh-pages > /dev/null

echo "deployed <3"

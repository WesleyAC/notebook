#!/usr/bin/env bash

set -e

if ! [ -z "$(git status --porcelain)" ]; then 
	echo "working directory not clean, exiting." 
	exit 1
fi

if ! git diff --exit-code > /dev/null; then
	echo "working directory not clean, exiting." 
	exit 1
fi

if [ `git branch | grep gh-pages` ]
then
	git branch -D gh-pages
fi
git checkout -b gh-pages

./bin/assemble.sh
./bin/validate.sh

find . -maxdepth 1 ! -name 'out' ! -name '.git' ! -name '.gitignore' ! -name 'node_modules' -exec rm -rf {} \;
mv out/* .
rmdir out/

git add -A
git commit --allow-empty -m "$(git log -1 --pretty=%B)"
git push -f -q origin gh-pages

git checkout -

echo "deployed <3"

exit 0

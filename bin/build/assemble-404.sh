#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"/../../
source ./bin/build/vars.sh

mkdir -p "$(dirname "$1")"

sed \
	-e "s/★PAGE_TITLE★/404 Error ⁑ $BLOG_NAME/g" \
	-e "s/★OG_TITLE★/404 Error/g" \
	-e "s/★OG_TYPE★/website/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/404.html > "$1"

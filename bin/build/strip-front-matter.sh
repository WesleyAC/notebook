#!/usr/bin/env bash

# https://stackoverflow.com/questions/28221779/how-to-remove-yaml-frontmatter-from-markdown-files
sed '1 { /^---$/ { :a N; /\n---$/! ba; d} }' "$1"

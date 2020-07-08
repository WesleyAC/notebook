#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"/..

if [ "$#" -ne 1 ]; then
    echo "usage: $0 entry-slug"
    exit 1
fi

ENTRY_PATH=./entries/$(date +'%s')-$1.md

cat <<ENTRY_START_TEXT > "$ENTRY_PATH"
# 

ENTRY_START_TEXT

$EDITOR "$ENTRY_PATH"

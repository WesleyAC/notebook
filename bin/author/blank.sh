#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"/../../

ENTRY_SLUG="$1"

if [ "$#" -ne 1 ]; then
	ENTRY_SLUG=$(date +"%m-%d-%Y")
fi

ENTRY_PATH=./entries/$(date +'%s')-$ENTRY_SLUG.md
TIMEZONE=$(timedatectl show -p Timezone --value)

cat <<ENTRY_START_TEXT > "$ENTRY_PATH"
---
{
	"timezone": "$TIMEZONE",
	"location": ""
}
---
# 

ENTRY_START_TEXT

$EDITOR "$ENTRY_PATH"

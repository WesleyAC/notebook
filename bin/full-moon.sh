#!/usr/bin/env bash

LP=2551443
NOW=$(date -u +"%s")
NEWMOON=592500
PHASE=$(((NOW - NEWMOON) % LP))
PHASE_DAY=$(((PHASE / 86400) + 1))

if [[ $PHASE_DAY == "15" ]]; then
	exit 1
else
	exit 0
fi

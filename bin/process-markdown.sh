#!/usr/bin/env bash

SIDENOTE_NUM=1

while read -r line
do
	case "$line" in 
		@sidenote:*)
			SIDENOTE_TEXT=$(echo "$line" | cut -d: -f 2)
			cat <<SIDENOTE_HTML
<label for="sn-$SIDENOTE_NUM" class="margin-toggle sidenote-number"></label>
<input type="checkbox" id="sn-$SIDENOTE_NUM" class="margin-toggle"/>
<span class="sidenote" id="sn-$SIDENOTE_NUM">
$SIDENOTE_TEXT
</span>
SIDENOTE_HTML
			SIDENOTE_NUM=$((SIDENOTE_NUM+1))
		;;
		*)
			echo "$line"
		;;
	esac
done < /dev/stdin

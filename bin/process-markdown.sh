#!/bin/bash

while read -r line
do
	case "$line" in 
		@sidenote:*:*)
			SIDENOTE_ID=$(echo "$line" | cut -d: -f 2)
			SIDENOTE_TEXT=$(echo "$line" | cut -d: -f 3)
			cat <<SIDENOTE_HTML
<label for="sn-$SIDENOTE_ID" class="margin-toggle sidenote-number"></label>
<input type="checkbox" id="sn-$SIDENOTE_ID" class="margin-toggle"/>
<span class="sidenote" id="sn-$SIDENOTE_ID">
$SIDENOTE_TEXT
</span>
SIDENOTE_HTML
		;;
		*)
			echo "$line"
		;;
	esac
done < /dev/stdin

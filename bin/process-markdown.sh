#!/usr/bin/env bash

SIDENOTE_NUM=1
MARGINNOTE_NUM=1

while IFS='' read -r line
do
	case "$line" in 
		@sidenote:*)
			SIDENOTE_TEXT=$(echo "$line" | cut -d: -f 2-)
			cat <<SIDENOTE_HTML
<label for="sn-$SIDENOTE_NUM" class="margin-toggle sidenote-number"></label>
<input type="checkbox" id="sn-$SIDENOTE_NUM" class="margin-toggle"/>
<span class="sidenote">
$SIDENOTE_TEXT
</span>
SIDENOTE_HTML
			SIDENOTE_NUM=$((SIDENOTE_NUM+1))
		;;
		@marginnote:*)
			MARGINNOTE_TEXT=$(echo "$line" | cut -d: -f 2-)
			cat <<MARGINNOTE_HTML
<label for="mn-$MARGINNOTE_NUM" class="margin-toggle">&#8853;</label>
<input type="checkbox" id="mn-$MARGINNOTE_NUM" class="margin-toggle"/>
<span class="marginnote">
$MARGINNOTE_TEXT
</span>
MARGINNOTE_HTML
			MARGINNOTE_NUM=$((SIDENOTE_NUM+1))
		;;
		@marginnote-mobilehide:*)
			MARGINNOTE_TEXT=$(echo "$line" | cut -d: -f 2-)
			cat <<MARGINNOTE_HTML
<input type="checkbox" id="mn-$MARGINNOTE_NUM" class="margin-toggle"/>
<span class="marginnote">
$MARGINNOTE_TEXT
</span>
MARGINNOTE_HTML
			MARGINNOTE_NUM=$((SIDENOTE_NUM+1))
		;;
		@marginnote-mobileshow:*)
			MARGINNOTE_TEXT=$(echo "$line" | cut -d: -f 2-)
			cat <<MARGINNOTE_HTML
<input type="checkbox" id="mn-$MARGINNOTE_NUM" class="margin-toggle" checked/>
<span class="marginnote">
$MARGINNOTE_TEXT
</span>
MARGINNOTE_HTML
			MARGINNOTE_NUM=$((SIDENOTE_NUM+1))
		;;
		*)
			echo "$line"
		;;
	esac
done < /dev/stdin

#!/usr/bin/env bash

set -e

IN_SECTION=false
FIRST_HEADING=true

while read -r line
do
	case "$line" in 
		*\</h1\>*|*\</h2\>*)
			if [[ "$IN_SECTION" == true ]]; then
				echo "</section>"
			fi
			if [[ $line == *"</h1>"* ]] && [[ "$FIRST_HEADING" == true ]]; then
				echo "<section>"
				echo "$line"
				echo "<p class='subtitle'>$1</p>"
				echo "</section>"
				echo "<section>"
				FIRST_HEADING=false
			else
				echo "<section>"
				echo "$line"
			fi
			IN_SECTION=true
		;;
		*)
			echo "$line"
		;;
	esac
done < /dev/stdin

if [[ "$IN_SECTION" == true ]]; then
	echo "</section>"
fi

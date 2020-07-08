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
			echo "$line"
			if [[ $line == *"</h1>"* ]]; then
				if [[ "$FIRST_HEADING" == true ]]; then
					echo "<p class='subtitle'>$1</p>"
					FIRST_HEADING=false
				fi
			fi
			echo "<section>"
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

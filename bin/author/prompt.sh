#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"/../../

ENTRY_PATH=./entries/$(date +'%s')-$(date +%Z)-$(date +'%m-%d-%Y').md

cat <<ENTRY_START_TEXT > "$ENTRY_PATH"
# 

ENTRY_START_TEXT

if ! ./bin/author/full-moon.sh; then
	echo "Tonight is a full moon. What has changed in your life since the last full moon?" >> "$ENTRY_PATH"
else
	printf "Today's cards are " >> "$ENTRY_PATH"

	N=1
	NUM_CARDS=${1:-2}
	IFS=$'\n'
	CARDS=$(shuf -n "$NUM_CARDS" ./data/tarot_data.csv)
	for card in $CARDS; do
		CARD_IMG="/img/tarot/$(echo "$card" | cut -d, -f1).jpg"
		CARD_URL="http://learntarot.com/$(echo "$card" | cut -d, -f2).htm"
		CARD_NAME=$(echo "$card" | cut -d, -f3)
		printf "[%s](%s)" "$CARD_NAME" "$CARD_URL" >> "$ENTRY_PATH"
		case $N in
			$((NUM_CARDS-1)))
				if [[ $NUM_CARDS == 2 ]]; then
					printf " and " >> "$ENTRY_PATH"
				else
					printf ", and " >> "$ENTRY_PATH"
				fi
			;;
			"$NUM_CARDS")
				printf "." >> "$ENTRY_PATH"
			;;
			*)
				printf ", " >> "$ENTRY_PATH"
			;;
		esac
		N=$((N+1))
	done

	printf "\n\n<input type='checkbox' class='margin-toggle' checked/><span class='marginnote'>" >> "$ENTRY_PATH"
	for card in $CARDS; do
		CARD_IMG="/img/tarot/$(echo "$card" | cut -d, -f1).jpg"
		CARD_URL="http://learntarot.com/$(echo "$card" | cut -d, -f2).htm"
		CARD_NAME=$(echo "$card" | cut -d, -f3)
		printf "<a href='$CARD_URL'><img style='width:$(bc -l <<< "scale=2; 100/$NUM_CARDS")%%;' src='$CARD_IMG' alt='$CARD_NAME tarot card'></img></a>" >> "$ENTRY_PATH"
	done
	printf "</span>" >> "$ENTRY_PATH"
fi

$EDITOR "$ENTRY_PATH"

#!/bin/sh

set -e

POST_TITLE=$(sed -n -e '/^---$/{n;p}' "$2" | sed -n -e '2p' | sed 's/^#[ ]*//g' | pandoc --from=markdown --to=html | sed -e 's#<p>##g' -e 's#</p>##g')
# shellcheck disable=SC2001
POST_TITLE_NOHTML=$(echo "$POST_TITLE" | sed 's/<[^>]*>//g')
# shellcheck disable=SC2001
POST_TITLE_NOHTML_SEDESCAPE=$(echo "$POST_TITLE_NOHTML" | sed 's/\&/\\\&/g')

if [ "$1" = "--html" ]; then
	printf "%s" "$POST_TITLE"
elif [ "$1" = "--nohtml" ]; then
	printf "%s" "$POST_TITLE_NOHTML"
elif [ "$1" = "--nohtml-escaped" ]; then
	printf "%s" "$POST_TITLE_NOHTML_SEDESCAPE"
else
	exit 1
fi

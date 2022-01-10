#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"/../../
source ./bin/build/vars.sh

HTML_ENTRIES=()
ATOM_ENTRIES=()

while (( $# > 2 ))
do
	ENTRY_SLUG=$(basename "$1" | cut -d- -f2- | rev | cut -d. -f2- | rev)
	ENTRY_TITLE_HTML=$(./bin/build/get-entry-title.sh --html "$1")
	HTML_ENTRIES+=("<li><a href='/$ENTRY_SLUG/'>$ENTRY_TITLE_HTML</a></li>")
	ENTRY_URL="$BLOG_URL/$ENTRY_SLUG/"
	ENTRY_TITLE_NOHTML=$(./bin/build/get-entry-title.sh --nohtml "$1")
	ENTRY_FRONT_MATTER=$(sed -n '2,/^---$/{ /^---$/d; p; }' "$1")
	ENTRY_TIMEZONE=$(echo "$ENTRY_FRONT_MATTER" | jq -r .timezone)
	ENTRY_TIMESTAMP=$(basename "$1" | cut -d- -f1)
	ENTRY_DATE_ATOM=$(TZ=$ENTRY_TIMEZONE date -d @"$ENTRY_TIMESTAMP" +'%Y-%m-%dT%H:%M:%SZ')
	ATOM_ENTRIES+=("<entry><id>$ENTRY_URL</id><title>$ENTRY_TITLE_NOHTML</title><updated>$ENTRY_DATE_ATOM</updated><link rel='alternate' href='$ENTRY_URL'/><author><name>Wesley Aptekar-Cassels</name></author></entry>")
	shift
done

# it's really gross that this is two commands. fix.
sed \
	-e "s/★PAGE_TITLE★/$BLOG_NAME/g" \
	-e "s/★OG_TITLE★/$BLOG_NAME/g" \
	-e "s/★OG_TYPE★/website/g" \
	-e "s/★TWITTER_CARD_TYPE★/summary/g" \
	-e "/★EXTRA_TAGS★/{
		i <meta property=\"og:image\" content=\"$BLOG_URL/fleuron.png\"/>
		i <meta name=\"description\" content=\"Wesley's notebook\"/>
	}" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/index.html > "$1"

# shellcheck disable=SC1111
printf '%s\n' "${HTML_ENTRIES[@]}" |
sed \
	-e "s#<a href='\([^']*\)'>\(.*\)”</a>#<a href='\1'>\2</a><a class='no-tufte-underline' href='\1'>”</a>#" \
	-e "s#<a href='\([^']*\)'>“\(.*\)</a>#<a class='no-tufte-underline' href='\1'>“</a><a href='\1'>\2</a>#" |
sed -i "/★POST_LIST★/{
	s/★POST_LIST★//g
	r /dev/stdin
}" "$1"

LAST_UPDATED_ATOM=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
echo "${ATOM_ENTRIES[*]}" |
sed \
	-e "s/★PAGE_UPDATED★/$LAST_UPDATED_ATOM/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/atom.xml > "$2"

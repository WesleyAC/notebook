#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"/..

if [[ $(ls -1 ./entries/ | cut -d- -f2- | sort | uniq -d) ]]; then
	echo "duplicate slugs found, exiting..."
	exit 1
fi

rm -rf ./out
mkdir -p ./out

BLOG_NAME="Wesley's Notebook"

cp -r ./static/* ./out/

minify ./parts/tufte-edit.css > ./out/tufte-edit.min.css

HTML_ENTRIES=()
ATOM_ENTRIES=()

for entry in $(ls -1 ./entries | tac)
do
	ENTRY_SLUG=$(echo "${entry%.*}" | cut -d- -f2-)
	ENTRY_DATE=$(date -d @"$(echo "$entry" | cut -d- -f1)" +"%A %B %-d, %Y")
	ENTRY_DATE_ATOM=$(date -d @"$(echo "$entry" | cut -d- -f1)" +'%Y-%m-%dT%H:%M:%SZ')
	mkdir -p ./out/"$ENTRY_SLUG"/

	POST_TITLE=$(head -n1 ./entries/"$entry" | sed 's/^#[ ]*//g')

	HTML_ENTRIES+=("<a href='/$ENTRY_SLUG/'>$POST_TITLE</a><br>")

	./bin/process-markdown.sh < ./entries/"$entry" |
	./bin/pandoc --from=markdown --to=html |
	./bin/process-html.sh "$ENTRY_DATE" |
	./bin/fix-sidenote-spacing.sh |
	sed \
		-e "s/★PAGE_TITLE★/$POST_TITLE ⁑ $BLOG_NAME/g" \
		-e "/★PAGE_CONTENT★/{
			s/★PAGE_CONTENT★//g
			r /dev/stdin
			r ./parts/return_home.html
		}" \
		./parts/template.html > ./out/"$ENTRY_SLUG"/index.html

	ENTRY_URL="https://notebook.wesleyac.com/$ENTRY_SLUG/"

	ATOM_ENTRIES+=("<entry><id>$ENTRY_URL</id><title>$POST_TITLE</title><updated>$ENTRY_DATE_ATOM</updated><link rel='alternate' href='$ENTRY_URL'/><author>Wesley Aptekar-Cassels</author></entry>")
done

LAST_UPDATED_ATOM=$(date +'%Y-%m-%dT%H:%M:%SZ')
echo "${ATOM_ENTRIES[*]}" |
sed \
	-e "s/★PAGE_UPDATED★/$LAST_UPDATED_ATOM/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/atom.xml > ./out/atom.xml

# it's really gross that this is two commands. fix.
sed \
	-e "s/★PAGE_TITLE★/$BLOG_NAME/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/index.html > ./out/index.html

echo "${HTML_ENTRIES[*]}" |
sed -i "/★POST_LIST★/{
	s/★POST_LIST★//g
	r /dev/stdin
}" ./out/index.html

#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"/..

if [[ $(ls -1 ./entries/ | cut -d- -f2- | sort | uniq -d) ]]; then
	echo "duplicate slugs found, exiting..."
	exit 1
fi

rm -rf ./out
mkdir -p ./out

BLOG_NAME="Wesley’s Notebook"
BLOG_URL="https://notebook.wesleyac.com"

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

	POST_TITLE=$(head -n1 ./entries/"$entry" | sed 's/^#[ ]*//g' | ./bin/pandoc --from=markdown --to=html | sed -e 's#<p>##g' -e 's#</p>##g')
	POST_TITLE_NOHTML=$(echo $POST_TITLE | sed 's/<[^>]*>//g')
	POST_TITLE_NOHTML_SEDESCAPE=$(echo $POST_TITLE_NOHTML | sed 's/\&/\\\&/g')

	HTML_ENTRIES+=("<a href='/$ENTRY_SLUG/'>$POST_TITLE</a><br>")

	./bin/process-markdown.sh < ./entries/"$entry" |
	./bin/pandoc --from=markdown --to=html |
	./bin/process-html.sh "$ENTRY_DATE" |
	./bin/fix-sidenote-spacing.sh |
	sed \
		-e "s/★PAGE_TITLE★/$POST_TITLE_NOHTML_SEDESCAPE ⁑ $BLOG_NAME/g" \
		-e "s/★OG_TITLE★/$POST_TITLE_NOHTML_SEDESCAPE/g" \
		-e "s/★OG_TYPE★/article/g" \
		-e "/★PAGE_CONTENT★/{
			s/★PAGE_CONTENT★//g
			r /dev/stdin
			r ./parts/return_home.html
		}" \
		./parts/template.html > ./out/"$ENTRY_SLUG"/index.html

	# TODO: quoting, single quotes, ugh...
	OG_IMG=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" out/$ENTRY_SLUG/index.html | cut -d\" -f2 | head -n1)
	OG_ALT=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" out/$ENTRY_SLUG/index.html | cut -d\" -f4 | head -n1)

	if [[ $OG_IMG == /* ]]; then
		OG_IMG=$BLOG_URL$OG_IMG
	fi

	if [ -n "$OG_IMG" ]; then
		sed -i \
			-e "/★EXTRA_TAGS★/{
				i <meta property=\"og:image\" content=\"$OG_IMG\"/>
			}" \
			./out/"$ENTRY_SLUG"/index.html
		if [ -n "$OG_ALT" ]; then
			sed -i \
				-e "/★EXTRA_TAGS★/{
					i <meta property=\"og:image:alt\" content=\"$OG_ALT\"/>
				}" \
				./out/"$ENTRY_SLUG"/index.html
		fi
	fi

	ENTRY_URL="$BLOG_URL/$ENTRY_SLUG/"

	ATOM_ENTRIES+=("<entry><id>$ENTRY_URL</id><title>$POST_TITLE_NOHTML</title><updated>$ENTRY_DATE_ATOM</updated><link rel='alternate' href='$ENTRY_URL'/><author><name>Wesley Aptekar-Cassels</name></author></entry>")
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

sed \
	-e "s/★PAGE_TITLE★/404 Error ⁑ $BLOG_NAME/g" \
	-e "s/★OG_TITLE★/404 Error/g" \
	-e "s/★OG_TYPE★/website/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/404.html > ./out/404.html

# it's really gross that this is two commands. fix.
sed \
	-e "s/★PAGE_TITLE★/$BLOG_NAME/g" \
	-e "s/★OG_TITLE★/$BLOG_NAME/g" \
	-e "s/★OG_TYPE★/website/g" \
	-e "/★EXTRA_TAGS★/{
		i <meta property=\"og:image\" content=\"$BLOG_URL/fleuron.png\"/>
	}" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/index.html > ./out/index.html

printf '%s\n' "${HTML_ENTRIES[@]}" |
sed "s#<a href='\([^']*\)'>\(.*\)”</a>#<a href='\1'>\2</a><a class='no-tufte-underline' href='\1'>”</a>#" |
sed -i "/★POST_LIST★/{
	s/★POST_LIST★//g
	r /dev/stdin
}" ./out/index.html

html-minifier \
	--collapse-boolean-attributes \
	--collapse-whitespace \
	--minify-css true \
	--minify-js true \
	--remove-comments \
	--remove-empty-attributes \
	--remove-optional-tags \
	--remove-redundant-attributes \
	--sort-attributes \
	--sort-class-name \
	--input-dir ./out/ \
	--output-dir ./out/ \
	--file-ext html

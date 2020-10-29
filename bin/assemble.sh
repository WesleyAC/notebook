#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"/..

if [[ $(find ./entries/ -maxdepth 1 -type f | cut -d- -f2- | sort | uniq -d) ]]; then
	echo "duplicate slugs found, exiting..."
	exit 1
fi

rm -rf ./out
mkdir -p ./out

BLOG_NAME="Wesley’s Notebook"
BLOG_URL="https://notebook.wesleyac.com"

echo "copying static files..."

cp -r ./static/* ./out/

echo "minifying css..."
minify ./parts/tufte-edit.css > ./out/tufte-edit.min.css

echo "minifying javascript..."
babel --presets=env ./parts/sideline.js | uglifyjs --compress --mangle > ./out/sideline.min.js
babel --presets=env ./parts/linktext.js | uglifyjs --compress --mangle > ./out/linktext.min.js

HTML_ENTRIES=()
ATOM_ENTRIES=()

echo "processing posts..."
for entry in $(cd ./entries && find . -maxdepth 1 -type f | cut -c3- | sort | tac)
do
	ENTRY_SLUG=$(echo "${entry%.*}" | cut -d- -f2-)
	ENTRY_DATE=$(date -d @"$(echo "$entry" | cut -d- -f1)" +"%A %B %-d, %Y")
	ENTRY_DATE_ATOM=$(date -d @"$(echo "$entry" | cut -d- -f1)" +'%Y-%m-%dT%H:%M:%SZ')
	mkdir -p ./out/"$ENTRY_SLUG"/

	POST_TITLE=$(head -n1 ./entries/"$entry" | sed 's/^#[ ]*//g' | pandoc --from=markdown --to=html | sed -e 's#<p>##g' -e 's#</p>##g')
	# shellcheck disable=SC2001
	POST_TITLE_NOHTML=$(echo "$POST_TITLE" | sed 's/<[^>]*>//g')
	# shellcheck disable=SC2001
	POST_TITLE_NOHTML_SEDESCAPE=$(echo "$POST_TITLE_NOHTML" | sed 's/\&/\\\&/g')

	HTML_ENTRIES+=("<a href='/$ENTRY_SLUG/'>$POST_TITLE</a><br>")

	./bin/process-markdown.sh < ./entries/"$entry" |
	pandoc --from=markdown --to=html |
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

	if grep -E -q '^@sidenote:' "./entries/$entry"; then
		sed -i \
			-e "/★EXTRA_TAGS★/{
				r ./parts/sidenote_script.html
			}" \
			./out/"$ENTRY_SLUG"/index.html
	fi

	# TODO: quoting, single quotes, ugh...
	OG_IMG=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" "out/$ENTRY_SLUG/index.html" | cut -d\" -f2 | head -n1)
	OG_ALT=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" "out/$ENTRY_SLUG/index.html" | cut -d\" -f4 | head -n1)

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

echo "making atom feed..."
LAST_UPDATED_ATOM=$(date +'%Y-%m-%dT%H:%M:%SZ')
echo "${ATOM_ENTRIES[*]}" |
sed \
	-e "s/★PAGE_UPDATED★/$LAST_UPDATED_ATOM/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/atom.xml > ./out/atom.xml

echo "making 404 page..."
sed \
	-e "s/★PAGE_TITLE★/404 Error ⁑ $BLOG_NAME/g" \
	-e "s/★OG_TITLE★/404 Error/g" \
	-e "s/★OG_TYPE★/website/g" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/404.html > ./out/404.html

echo "making index page..."
# it's really gross that this is two commands. fix.
sed \
	-e "s/★PAGE_TITLE★/$BLOG_NAME/g" \
	-e "s/★OG_TITLE★/$BLOG_NAME/g" \
	-e "s/★OG_TYPE★/website/g" \
	-e "/★EXTRA_TAGS★/{
		i <meta property=\"og:image\" content=\"$BLOG_URL/fleuron.png\"/>
		i <meta name=\"description\" content=\"Wesley's notebook\"/>
	}" \
	-e "/★PAGE_CONTENT★/{
		s/★PAGE_CONTENT★//g
		r /dev/stdin
	}" \
	./parts/template.html < ./parts/index.html > ./out/index.html

# shellcheck disable=SC1111
printf '%s\n' "${HTML_ENTRIES[@]}" |
sed "s#<a href='\([^']*\)'>\(.*\)”</a>#<a href='\1'>\2</a><a class='no-tufte-underline' href='\1'>”</a>#" |
sed -i "/★POST_LIST★/{
	s/★POST_LIST★//g
	r /dev/stdin
}" ./out/index.html

echo "minifying html..."
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

echo "compressing pngs..."
find ./out/ -type f -name "*.png" -exec optipng -quiet -o7 {} \;
find ./out/ -type f -name "*.png" -exec pngcrush -s -reduce -brute -ow {} \;
echo "compressing jpegs..."
find ./out/ -type f \( -name "*.jpg" -o -name "*.jpeg" \) -exec jpegoptim --quiet --strip-all {} \;
echo "converting pngs to webp..."
find ./out/ -type f -name "*.png" | while read -r f ; do cwebp -quiet -z 9 "$f" -o "${f%.*}.webp"; done
echo "converting jpegs to webp..."
find ./out/ -type f \( -name "*.jpg" -o -name "*.jpeg" \) | while read -r f ; do cwebp -quiet -q 50 "$f" -o "${f%.*}.webp" ; done

#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"/../../
source ./bin/build/vars.sh

ENTRY_PATH="$1"
OUT_FILE="$2"
ENTRY_NAME=$(basename "$ENTRY_PATH")
ENTRY_SLUG=$(echo "$ENTRY_NAME" | cut -d- -f2- | rev | cut -d. -f2- | rev)
ENTRY_FRONT_MATTER=$(sed -n '2,/^---$/{ /^---$/d; p; }' "$ENTRY_PATH")
ENTRY_LOCATION=$(echo "$ENTRY_FRONT_MATTER" | jq -r .location)
ENTRY_DATE=$(TZ=$(echo "$ENTRY_FRONT_MATTER" | jq -r .timezone) date -d @"$(echo "$ENTRY_NAME" | cut -d- -f1)" +"%A %B %-d, %Y")

mkdir -p "$(dirname "$OUT_FILE")"

POST_TITLE_NOHTML_SEDESCAPE=$(./bin/build/get-entry-title.sh --nohtml-escaped "$ENTRY_PATH")


CHANGELOG_TEMPLATE=""
CHANGELOG_ENTRIES=""

IGNORE_CHANGELOG_ENTRIES="(dafb92ca9368ffbe3dfb6c573262a3090e6ff52d)|(bd624d82f96a37c1f83c815591d5151bf740a885)|(175c73f195c98b89e345fcc51ee3b32f3db94675)|(79b0710cd48e7bdd299c6d0dc78a1eb9c43d50a0)|(2cbde19c88df42af2c108773dd711f88a1c08dd4)|(87177f142895e4f4d0dbde5c6655ef85cee5f8df)|(396d37942db46f21cf254ad261ee4c86269205da)|(0741abcd9b56a131703b8d6bd9fd095e8db67d88)|(465b7ab19a0a3d430a3c432c32bbfb6cd40b4dfe)|(bf53b4879560878b623a93e68876787c507dc36f)"

if [[ $(git log --follow --pretty="format:%H" "$ENTRY_PATH" | grep -E -c -v "$IGNORE_CHANGELOG_ENTRIES") -ge 2 ]]; then
	CHANGELOG_TEMPLATE="$(tr --delete '\n' < ./parts/changelog.html)"
	CHANGELOG_ENTRIES="$(
		TZ=UTC git log \
		--follow \
		--date=format:'%d %b %Y' \
		--pretty="format:<div><time datetime='%ai'>%ad</time>: <a href='$GIT_WEB_URL%H'>%s</a></div>" "$ENTRY_PATH" |
		grep -E -v "$IGNORE_CHANGELOG_ENTRIES" |
		tac |
		tr --delete '\n'
	)"
fi

# Note that the changelog template must be at the bottom, in order for it to
# not fuck up opengraph images.
# shellcheck disable=SC2001
./bin/build/strip-front-matter.sh "$ENTRY_PATH" |
./bin/build/process-markdown.sh |
pandoc --from=markdown --to=html |
./bin/build/process-html.sh "$ENTRY_DATE — $ENTRY_LOCATION" |
./bin/build/fix-sidenote-spacing.sh |
sed \
	-e "s/★PAGE_TITLE★/$POST_TITLE_NOHTML_SEDESCAPE ⁑ $BLOG_NAME/g" \
	-e "s/★OG_TITLE★/$POST_TITLE_NOHTML_SEDESCAPE/g" \
	-e "s/★OG_TYPE★/article/g" \
	-e "/★PAGE_CONTENT★/{
		a <article>
		s/★PAGE_CONTENT★//g
		r /dev/stdin
		r ./parts/return_home.html
		a $CHANGELOG_TEMPLATE
		a </article>
	}" \
	./parts/template.html |
sed -e "s/★CHANGELOG_CONTENT★/$(echo "$CHANGELOG_ENTRIES" | sed "s#/#\\\\/#g" | sed "s#&#\\\\&#g")/g" |
./bin/build/rewrite-time-format.sh |
./bin/build/rewrite-imgs.sh > "$OUT_FILE"

sed -i -e "/★EXTRA_TAGS★/{
  a <script defer src='/titleresize.min.js'></script>
	a <link rel='alternate' type='text/markdown' href='$ENTRY_SLUG.md' title='Markdown version.'/>
}" "$OUT_FILE"

if grep -E -q '^@sidenote:' "$ENTRY_PATH"; then
	sed -i \
		-e "/★EXTRA_TAGS★/{
			r ./parts/sidenote_script.html
		}" "$OUT_FILE"
fi

CUSTOM_CSS_FILE=${OUT_FILE//index.html/custom.css}
if [[ -f $CUSTOM_CSS_FILE ]]; then
	sed -i \
		-e "/★EXTRA_TAGS★/{
			a <style>
			r $CUSTOM_CSS_FILE
			a </style>
		}" "$OUT_FILE"

fi

MAYBE_OG_IMG=$(compgen -G "static/img/post/$ENTRY_SLUG/og_image.*" | head -n1)
if [ "$MAYBE_OG_IMG" = "" ]; then
	# TODO: quoting, single quotes, ugh...
	OG_IMG=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" "$OUT_FILE" | cut -d\" -f2 | head -n1)
	OG_ALT=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" "$OUT_FILE" | cut -d\" -f4 | head -n1)
else
	OG_IMG=${MAYBE_OG_IMG#static}
	OG_ALT=$(cat "static/img/post/$ENTRY_SLUG/og_image_alt.txt") # TODO warn if doesn't exist?
fi
TWITTER_CARD_TYPE="summary"

if [[ $OG_IMG == /* && $OG_IMG != "/icons/history.svg" ]]; then
	OG_IMG=$BLOG_URL$OG_IMG
	TWITTER_CARD_TYPE="summary_large_image"
fi

sed -i -e "s/★TWITTER_CARD_TYPE★/$TWITTER_CARD_TYPE/g" "$OUT_FILE"

if [ -n "$OG_IMG" ]; then
	sed -i \
		-e "/★EXTRA_TAGS★/{
			i <meta property=\"og:image\" content=\"$OG_IMG\"/>
		}" "$OUT_FILE"
	if [ -n "$OG_ALT" ]; then
		sed -i \
			-e "/★EXTRA_TAGS★/{
				i <meta property=\"og:image:alt\" content=\"$OG_ALT\"/>
			}" "$OUT_FILE"
	fi
fi

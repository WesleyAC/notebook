#!/usr/bin/env bash

set -e
cd "$(dirname "$0")"/../../
source ./bin/build/vars.sh

ENTRY_PATH="$1"
OUT_FILE="$2"
ENTRY_NAME=$(basename "$ENTRY_PATH")
ENTRY_SLUG=$(echo "$ENTRY_NAME" | cut -d- -f3- | rev | cut -d. -f2- | rev)
ENTRY_DATE=$(TZ=$(echo "$ENTRY_NAME" | cut -d- -f2) date -d @"$(echo "$ENTRY_NAME" | cut -d- -f1)" +"%A %B %-d, %Y")

mkdir -p "$(dirname "$OUT_FILE")"

POST_TITLE_NOHTML_SEDESCAPE=$(./bin/build/get-entry-title.sh --nohtml-escaped "$ENTRY_PATH")


CHANGELOG_TEMPLATE=""
CHANGELOG_ENTRIES=""

if [[ $(git log --oneline "$ENTRY_PATH" | wc -l) -ge 2 ]]; then
	CHANGELOG_TEMPLATE="$(tr --delete '\n' < ./parts/changelog.html)"
	CHANGELOG_ENTRIES="$(
		TZ=UTC git log \
		--follow \
		--date=format:'%d %b %Y' \
		--pretty="format:<div><time datetime='%ai'>%ad</time>: <a href='$GIT_WEB_URL%H'>%s</a></div>" "$ENTRY_PATH" |
		tac |
		tr --delete '\n'
	)"
fi

# Note that the changelog template must be at the bottom, in order for it to
# not fuck up opengraph images.
# shellcheck disable=SC2001
./bin/build/process-markdown.sh < "$ENTRY_PATH" |
pandoc --from=markdown --to=html |
./bin/build/process-html.sh "$ENTRY_DATE" |
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
sed -e "s/★CHANGELOG_CONTENT★/$(echo "$CHANGELOG_ENTRIES" | sed "s#/#\\\\/#g")/g" |
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

# TODO: quoting, single quotes, ugh...
OG_IMG=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" "$OUT_FILE" | cut -d\" -f2 | head -n1)
OG_ALT=$(grep -o "<img src=\"[^\"]\+\"\( alt=\"[^\"]\+\)\?" "$OUT_FILE" | cut -d\" -f4 | head -n1)
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

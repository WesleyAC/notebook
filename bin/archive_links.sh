#!/bin/sh

cd "$(dirname "$0")"/.. || exit

TMP_FILE=$(mktemp /tmp/outgoing-links.tmp.XXXXXXXXX)
trap 'rm -rf $TMP_FILE' EXIT

# shellcheck disable=SC2044
for FILE in $(find ./out/site/ -name "*.html")
do
    for URL in $(xidel --silent --extract "//a/@href" "$FILE")
    do
        case "$URL" in
            https://*|http://*)
                echo "$URL" | grep -E -f ./data/ignore_unarchived_links.txt > /dev/null 2>&1 && continue
		echo "$URL" >> "$TMP_FILE"
                ;;
            *)
                ;;
        esac
    done
done

(cd data/archivebox/ && archivebox add --parser url_list < "$TMP_FILE")

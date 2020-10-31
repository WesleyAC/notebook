#!/bin/sh

# shellcheck disable=SC2044
for FILE in $(find ./out/site/ -name "*.html")
do
    for URL in $(xidel --silent --extract "//a/@href" "$FILE")
    do
        case "$URL" in
            https://*|http://*)
                URL_HASH=$(echo "$URL" | b3sum | cut -d" " -f1)
                if [ ! -f "./data/archive/$URL_HASH" ]
                then
                    TMPFILE=$(mktemp -t "archive_$URL_HASH.XXXXXXXXXX")
                    if (archivenow --ia "$URL" > "$TMPFILE"); then
                        if grep -E -q '^https://web.archive.org/' "$TMPFILE"; then
                            mv "$TMPFILE" "./data/archive/$URL_HASH"
                        fi
                    fi
                fi
                ;;
            *)
                ;;
        esac
    done
done

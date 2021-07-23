#!/bin/sh

cd "$(dirname "$0")"/.. || exit

# shellcheck disable=SC2044
for FILE in $(find ./out/site/ -name "*.html")
do
    for URL in $(xidel --silent --extract "//a/@href" "$FILE")
    do
        case "$URL" in
            https://*|http://*)
                echo "$URL" | grep -E -f ./data/ignore_unarchived_links.txt > /dev/null 2>&1 && continue
                URL_HASH=$(echo "$URL" | b3sum | cut -d" " -f1)
                if [ ! -f "./data/archive/$URL_HASH" ]
                then
                    echo "archiving $URL"
                    TMPFILE=$(mktemp -t "archive_$URL_HASH.XXXXXXXXXX")
                    if (archivenow --ia "$URL" > "$TMPFILE"); then
                        if grep -E -q '^https://web.archive.org/' "$TMPFILE"; then
                            mv "$TMPFILE" "./data/archive/$URL_HASH"
                            echo "archived $URL ($URL_HASH)"
                        else
                            echo "failed to archive $URL (incorrect link)"
                        fi
                    else
                        echo "failed to archive $URL (archivenow failure)"
                    fi
                fi
                ;;
            *)
                ;;
        esac
    done
done

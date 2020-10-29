#!/bin/sh

cd "$(dirname "$0")"/.. || exit

FAIL=0

echo "validating html..."

find ./out -name "*.html" -exec html5validator {} + || FAIL=1

echo "running shellcheck..."

find . -name "*.sh" -exec shellcheck {} + || FAIL=2

echo "checking broken links..."

# shellcheck disable=SC2044
for FILE in $(find ./out/ -name "*.html")
do
    for URL in $(xidel --silent --extract "//a/@href" "$FILE")
    do
        case "$URL" in
            https://*|http://*)
                URL_HASH=$(echo "$URL" | b3sum | cut -d" " -f1)
                if [ ! -f "./data/archive/$URL_HASH" ]
                then
                    echo "url not archived: $URL"
                    FAIL=3
                fi
                echo "$URL" | grep -E -f ./data/ignore_broken_links.txt > /dev/null 2>&1 && continue
                if ! curl -A "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0" --max-time 5 --fail --head "$URL" > /dev/null 2>&1
                then
                    curl -A "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0" --max-time 30 --fail "$URL" > /dev/null 2>&1 || (echo "broken link: $FILE:$URL"; FAIL=4)
                fi
                ;;
            /*)
                test -f "./out$URL" || test -f "./out$URL/index.html" || (echo "broken link: $FILE:$URL"; FAIL=4)
                ;;
            mailto://*)
                echo "mailto links should not have //: $FILE:$URL"
                FAIL=4
                ;;
            mailto:*)
                ;;
            *)
                echo "unknown url type: $FILE:$URL"
                FAIL=4
        esac
    done
done

exit $FAIL

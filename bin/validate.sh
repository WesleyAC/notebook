#!/usr/bin/env bash

cd "$(dirname "$0")"/.. || exit

FAIL=0

echo "checking fonts..."

if ! diff ./data/font_hashes.txt <(cd ./out/site/fonts && sha256sum ./*); then
    echo "font hashes differ"
    FAIL=6
fi

echo "validating html..."

find ./out/site/ -name "*.html" -exec html5validator {} + || FAIL=1

echo "running shellcheck..."

find . -name "*.sh" -not -path "*/node_modules/*" -exec shellcheck {} + || FAIL=2

echo "running eslint..."

find . -name "*.js" -not -path "./out/*" -not -path "*/node_modules/*" -not -path "./data/archivebox/archive/*" -not -path "./static/deeplinks/*" -exec eslint {} + || FAIL=5

echo "checking timezones..."

if [[ $(find ./entries -mindepth 1 | cut -d- -f2 | grep -E -v -c "(EST)|(PST)|(PDT)|(ROC)") -gt 0 ]]; then
	echo "invalid timezone found :("
	FAIL=7
fi

echo "checking broken links..."

# shellcheck disable=SC2044
for FILE in $(find ./out/site/ -name "*.html")
do
    for URL in $(xidel --silent --extract "//a/@href" "$FILE")
    do
        case "$URL" in
            https://*|http://*)
                echo "$URL" | grep -E -f ./data/ignore_unarchived_links.txt > /dev/null 2>&1 && continue
                if ! echo "SELECT url FROM core_snapshot" | sqlite3 data/archivebox/index.sqlite3 | grep -q "^$URL$"
                then
                    if ! echo "$URL" | grep -E -q "^https://web.archive.org/web/"; then
                        echo "url not archived: $URL"
                        FAIL=3
                    fi
                fi
                echo "$URL" | grep -E -f ./data/ignore_broken_links.txt > /dev/null 2>&1 && continue
                if ! curl -A "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0" --max-time 5 --fail --head "$URL" > /dev/null 2>&1; then
                    if ! curl -A "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0" --max-time 30 --fail "$URL" > /dev/null 2>&1; then
                        echo "broken link: $FILE:$URL"
                        FAIL=4
                    fi
                fi
                ;;
            /*)
                if ! { test -f "./out/site${URL%#*}" || test -f "./out/site${URL%#*}/index.html"; }; then
                    echo "broken link: $FILE:$URL"
                    FAIL=4
                fi
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

#!/usr/bin/env bash

sed \
	-e "s/[ ]*\(<label for='[^']*' class='margin-toggle sidenote-number'\)/\1/g" \
	-e "s/<\/span> ,/<\/span>,/g"

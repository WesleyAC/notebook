#!/bin/sh

# shellcheck disable=SC2016
xidel --silent --html - --xquery 'transform(/, function($e) { 
	$e / (if (name() = "time") then 
	<time datetime="{head(tokenize(@datetime, " "))}T{head(tail(tokenize(@datetime, " ")))}{head(tail(tail(tokenize(@datetime, " "))))}">{@* except @datetime, node()}</time>
         else .)
})'

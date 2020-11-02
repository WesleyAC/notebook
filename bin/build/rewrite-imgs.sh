#!/bin/sh

# shellcheck disable=SC2016
xidel --silent --html - --xquery 'transform(/, function($e) { 
	$e / (if (name() = "img") then 
		<picture>
			{(if (ends-with(@src, ".jpg") or ends-with(@src, ".jpeg")) then
				<source type="image/webp" srcset="{replace(@src, "(jpg|jpeg)$", "webp")}"/>
			else ())}
			{(if (ends-with(@src, ".jpg") or ends-with(@src, ".jpeg")) then
				<source type="image/jpeg" srcset="{@src}"/>
			else ())}
			{(if (ends-with(@src, ".png")) then
				<source type="image/webp" srcset="{replace(@src, "png$", "webp")}"/>
			else ())}
			{(if (ends-with(@src, ".png")) then
				<source type="image/png" srcset="{@src}"/>
			else ())}
		       {.}
		   </picture>
         else .)
})'

# Wesley's Notebook

This is the source code for my [notebook blog](https://notebook.wesleyac.com/), where I initially [wrote daily](https://notebook.drmaciver.com/posts/2020-06-08-10:11.html), and now write occasionally. It is built with a set of shell scripts primarily using [sed](https://www.gnu.org/software/sed/manual/sed.html), [ninja](https://ninja-build.org/), and [pandoc](https://pandoc.org/). I think it's pretty nice.

## Archival and Broken Links

The deploy script checks if any outwards links are broken (returning HTTP error codes), and does not allow a deploy if they are (unless the link has been explicitly added to a bypass list). Additionally, before deploying, all outgoing links are archived via [ArchiveBox](https://archivebox.io) to preserve a copy of the link at the time the post was written. This allows easy switching to archived copies of linked websites should they go offline in the future.

## Deep Links

There is some javascript allowing users to create deep links to any text selection. It is fairly lightweight, and the code should work on most websites. This will be moved into its own library quite soon.

## Changelogs

Whenever I update a post, a changelog is generated from the git history and embedded into the post, allowing people to quickly see how the post has changed over time, including links to diffs.

## Sidenotes

I make extensive use of sidenotes. The implementation is based on [tufte-css](https://edwardtufte.github.io/tufte-css/), but there is [additional javascript](/parts/sideline.js) used to draw lines connecting sidenote labels to sidenotes on hover.

## Image compression

Images are automatically compressed with [`pngcrush`](https://pmt.sourceforge.io/pngcrush/), [`optipng`](http://optipng.sourceforge.net/), and [`jpegoptim`](https://github.com/tjko/jpegoptim), and converted to webp. `<img>` tags are replaced with `<picture>` tags that have both the webp version and the original image.

## Link Prefetching

[Instantpage](https://instant.page/) is used to prefetch links on hover, making loading extremely fast (on supported browsers).

## 404 Page

My [404 page](https://notebook.wesleyac.com/404) allows you to write what you think should be there, and share it with others should you so wish. It's inspired by [The Creative Independent's](https://thecreativeindependent.com/) 404 page.

## Fonts

If you want to build this blog yourself, you should note that the fonts are not included in the git repo due to [licensing restrictions](https://okaytype.com/info/eula). The validation script checks that the fonts exist locally and have the correct hashes before deploying — if you have access to the correct fonts, you can build it after you copy the fonts into your local checkout, otherwise you can replace them with your own fonts.

## Post Template Generator

There is a [script](/bin/author/prompt.sh) to generate a writing prompt, either by [tarot pull](https://notebook.wesleyac.com/hermit-magician/) or [moon phase](/bin/author/full-moon.sh), as well as a script to generate a [blank post template](/bin/author/blank.sh).

## Future Work

In the future, I'd like to make a few improvements to my setup:

* Show archived versions of links, in a similar way to [Robust Links](https://robustlinks.mementoweb.org/).
* Implement outgoing [Webmentions](https://webmention.net/).
* Parallelize broken-link checking.
* Serve javascript/css/fonts from cachebusting filenames.
* Subset fonts (likely via [glyphhanger](https://github.com/zachleat/glyphhanger)).
* Generate changelog diffs locally, instead of linking to GitHub.
* Add search (via [stork](https://stork-search.net/) or [tinysearch](https://endler.dev/2019/tinysearch/)).
* Allow for different written and posted dates

## License

Except where otherwise noted, all code in this repository is licensed under the terms of the [MIT license](https://mit-license.org/). All prose is licensed under the terms of the [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) license.

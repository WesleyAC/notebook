#!/usr/bin/env python3

import os, subprocess

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, os.pardir))

ninja_rules = """
builddir = out/

rule compress-optipng
  command = optipng -quiet -o7 -clobber $in -out $out

rule compress-pngcrush
  command = pngcrush -s -reduce -brute $in $out

rule compress-jpg
  command = cp $in $out && jpegoptim --quiet --strip-all $out

rule compress-svgo
  command = svgo --quiet --multipass -i $in -o $out

rule make-webp-png
  command = cwebp -quiet -z 9 $in -o $out

rule make-webp-jpg
  command = cwebp -quiet -q 50 $in -o $out

rule minify-html
  command = html-minifier $
              --collapse-boolean-attributes $
              --collapse-whitespace $
              --minify-css true $
              --minify-js true $
              --remove-comments $
              --remove-empty-attributes $
              --remove-optional-tags $
              --remove-redundant-attributes $
              --sort-attributes $
              --sort-class-name $
              --output $out $
              $in

rule minify-js
  command = terser --compress --mangle -- $in > $out

rule minify-js-toplevel
  command = terser --compress --mangle --toplevel -- $in > $out

rule minify-css
  command = minify $in > $out

rule copy-file
  command = mkdir -p `dirname $out` && cp $in $out

rule assemble-post
  command = ./bin/build/assemble-post.sh $in $out

rule assemble-404
  command = ./bin/build/assemble-404.sh $out

rule assemble-index-atom
  command = ./bin/build/assemble-index-atom.sh $in $out
"""

fifo_name = 'build.ninja'
os.mkfifo(fifo_name)

try:
    process = subprocess.Popen(['ninja'])
    with open(fifo_name, 'w') as build_ninja:
        build_ninja.write(ninja_rules)

        for root, _, files in os.walk("static"):
            for filename in files:
                in_file = os.path.join(root, filename)
                out_file = os.path.join(root[7:], filename)
                out_file_webp = os.path.splitext(out_file)[0]+'.webp'
                if filename.endswith("png"):
                    build_ninja.write(f"build out/tmp/{out_file}.optipng: compress-optipng {in_file}\n")
                    build_ninja.write(f"build out/tmp/{out_file}: compress-pngcrush out/tmp/{out_file}.optipng\n")
                    build_ninja.write(f"build out/tmp/{out_file_webp}: make-webp-png out/tmp/{out_file}\n")
                    build_ninja.write(f"build out/site/{out_file}: copy-file out/tmp/{out_file}\n")
                    build_ninja.write(f"build out/site/{out_file_webp}: copy-file out/tmp/{out_file_webp}\n")
                elif filename.endswith("jpg") or filename.endswith("jpeg"):
                    build_ninja.write(f"build out/tmp/{out_file}: compress-jpg {in_file}\n")
                    build_ninja.write(f"build out/tmp/{out_file_webp}: make-webp-jpg out/tmp/{out_file}\n")
                    build_ninja.write(f"build out/site/{out_file}: copy-file out/tmp/{out_file}\n")
                    build_ninja.write(f"build out/site/{out_file_webp}: copy-file out/tmp/{out_file_webp}\n")
                elif filename.endswith("svg"):
                    build_ninja.write(f"build out/tmp/{out_file}: compress-svgo {in_file}\n")
                    build_ninja.write(f"build out/site/{out_file}: copy-file out/tmp/{out_file}\n")
                else:
                    build_ninja.write(f"build out/site/{out_file}: copy-file {in_file}\n")

        for js_file in ["sideline", "titleresize", "instantpage"]:
            build_ninja.write(f"build out/tmp/{js_file}.min.js: minify-js parts/{js_file}.js\n")
            build_ninja.write(f"build out/site/{js_file}.min.js: copy-file out/tmp/{js_file}.min.js\n")

        build_ninja.write("build out/tmp/notebook.min.css: minify-css parts/notebook.css\n")
        build_ninja.write("build out/site/notebook.min.css: copy-file out/tmp/notebook.min.css\n")

        for style_file in os.listdir("parts/customstyles/"):
            entry_name = style_file.rsplit(".", 1)[0]
            build_ninja.write(f"build out/tmp/{entry_name}/custom.css: minify-css parts/customstyles/{style_file}\n")

        entry_files = sorted(os.listdir("entries"), reverse=True)
        for entry in entry_files:
            out_file = entry.split("-", 2)[2][:-3]
            custom_css_file = f"out/tmp/{out_file}/custom.css" if os.path.isfile(f"parts/customstyles/{out_file}.css") else ""
            build_ninja.write(f"build out/tmp/{out_file}/index.html: assemble-post entries/{entry} | bin/build/assemble-post.sh bin/build/process-markdown.sh bin/build/rewrite-imgs.sh bin/build/process-html.sh bin/build/fix-sidenote-spacing.sh bin/build/vars.sh parts/template.html parts/return_home.html parts/sidenote_script.html parts/changelog.html {custom_css_file}\n")
            build_ninja.write(f"build out/tmp/{out_file}/index.min.html: minify-html out/tmp/{out_file}/index.html\n")
            build_ninja.write(f"build out/site/{out_file}/index.html: copy-file out/tmp/{out_file}/index.min.html\n")
            build_ninja.write(f"build out/site/{out_file}/{out_file}.md: copy-file entries/{entry}\n")

        build_ninja.write(f"build out/tmp/index.html out/tmp/atom.xml: assemble-index-atom entries/{' entries/'.join(entry_files)} | bin/build/assemble-index-atom.sh bin/build/vars.sh parts/template.html parts/index.html parts/atom.xml\n")
        build_ninja.write("build out/site/atom.xml: copy-file out/tmp/atom.xml\n")
        build_ninja.write("build out/tmp/index.min.html: minify-html out/tmp/index.html\n")
        build_ninja.write("build out/site/index.html: copy-file out/tmp/index.min.html\n")

        build_ninja.write("build out/tmp/404.html: assemble-404 | bin/build/assemble-404.sh bin/build/vars.sh parts/template.html parts/404.html\n")
        build_ninja.write("build out/tmp/404.min.html: minify-html out/tmp/404.html\n")
        build_ninja.write("build out/site/404.html: copy-file out/tmp/404.min.html\n")

    process.wait()
finally:
    os.remove(fifo_name)


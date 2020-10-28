with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "wesley-notebook";

  buildInputs = [
    bc
    minify
    entr
    nodejs
  ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}


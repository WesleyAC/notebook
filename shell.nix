with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "wesley-notebook";

  buildInputs = [
    pkgs.bc
    pkgs.minify
  ];
}


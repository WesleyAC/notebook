with import (builtins.fetchTarball {
  name = "nixos-nixpkgs-3d85bb08106a3d32350df2786fda62aa7fd49cd8";
  url = "https://github.com/nixos/nixpkgs/archive/3d85bb08106a3d32350df2786fda62aa7fd49cd8.tar.gz";
  sha256 = "0g5yg292ixbv4lilc11fr754ym702a2h833am9hxi3ir5flwb3ah";
}) {};

stdenv.mkDerivation {
  name = "wesley-notebook";

  buildInputs = [
    bc
    minify
    entr
    nodejs
    html5validator
    xidel
    curl
    shellcheck
    pandoc
    pngcrush
    optipng
    jpegoptim
    libwebp
    ninja
    python3
    archivebox
    sqlite
    jq
  ];
  shellHook = ''
    npm ci
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}

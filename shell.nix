with import (builtins.fetchTarball {
  name = "nixos-nixpkgs-3d85bb08106a3d32350df2786fda62aa7fd49cd8";
  url = "https://github.com/nixos/nixpkgs/archive/3d85bb08106a3d32350df2786fda62aa7fd49cd8.tar.gz";
  sha256 = "0g5yg292ixbv4lilc11fr754ym702a2h833am9hxi3ir5flwb3ah";
}) {};

let archivenow = (
  let archivenow = python38.pkgs.buildPythonPackage rec {
    pname = "archivenow";
    version = "2020.7.18.12.19.44";

    src = python38.pkgs.fetchPypi {
      inherit pname version;
      sha256 = "0d9hzd3dgspqhdadxhpaj5ym6dnih57kdns2i167796a9nr41kbj";
    };

    propagatedBuildInputs = [ python38Packages.requests python38Packages.flask ];
  };
  in python38.withPackages (ps: [ archivenow ])
);
in stdenv.mkDerivation {
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
    archivenow
    b3sum
    pandoc
    pngcrush
    optipng
    jpegoptim
    libwebp
    ninja
    python3
  ];
  shellHook = ''
    npm ci
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}

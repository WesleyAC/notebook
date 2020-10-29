with import <nixpkgs> {};

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
  ];
  shellHook = ''
    npm ci
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}



{ dna, pkgs, buildInputs, nativeBuildInputs, workspacePath, craneLib
, crateCargoToml, holochainCargoArtifacts, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  hcCargo = pkgs.callPackage holochainCargoArtifacts {
    inherit craneLib buildInputs nativeBuildInputs;
  };
  hcCargoArtifacts = hcCargo.cargoArtifacts;

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) {
    cargoArtifacts = hcCargoArtifacts;
    # cargoVendorDir = hcCargo.cargoVendorDir;

    cargoExtraArgs = " --tests --offline -vv";

    cargoBuildCommand = ''
      RUSTFLAGS="--remap-path-prefix $(pwd)=/build/source/" cargo build --profile release'';
    inherit buildInputs nativeBuildInputs src;
    doCheck = false;
    # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS =
    #   " -Clink-arg=-fuse-ld=mold";
    pname = "workspace-sweettest";
    version = "";
  };

in craneLib.cargoNextest {
  inherit buildInputs nativeBuildInputs src cargoArtifacts;
  version = "";
  pname = "test-${crate}";

  # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS = " -Clink-arg=-fuse-ld=mold";
  cargoNextestExtraArgs = "-p ${crate} --locked -j 1";

  DNA_PATH = dna;
}

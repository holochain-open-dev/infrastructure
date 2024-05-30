{ dna, pkgs, buildInputs, nativeBuildInputs, workspacePath, craneLib
, crateCargoToml, holochainCargoDeps, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  hcCargoDeps = pkgs.callPackage holochainCargoDeps {
    inherit craneLib buildInputs nativeBuildInputs;
  };

  cargoVendorDir = craneLib.vendorCargoDeps { inherit src; };

  rustFlags = ''
    RUSTFLAGS="--remap-path-prefix ${cargoVendorDir}=/build/source/ --remap-path-prefix ${hcCargoDeps.cargoVendorDir}=/build/source/"'';

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) {
    inherit cargoVendorDir buildInputs nativeBuildInputs src;
    cargoArtifacts = hcCargoDeps.cargoArtifacts;

    cargoExtraArgs = "";
    RUSTFLAGS = rustFlags;

    cargoBuildCommand = "cargo build --profile release --tests --offline";

    cargoCheckCommand = "";
    doCheck = false;
    # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS =
    #   " -Clink-arg=-fuse-ld=mold";
    pname = "workspace-sweettest";
    version = "";
  };

in craneLib.cargoNextest {
  inherit buildInputs nativeBuildInputs src cargoArtifacts cargoVendorDir;
  pname = "workspace-sweettest";
  version = "";
  RUSTFLAGS = rustFlags;

  # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS = " -Clink-arg=-fuse-ld=mold";
  cargoNextestExtraArgs = "-p ${crate} --offline -j 1";

  DNA_PATH = dna;
}

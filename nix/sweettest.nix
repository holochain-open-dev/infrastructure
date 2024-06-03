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

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) {
    inherit cargoVendorDir buildInputs nativeBuildInputs src;
    cargoArtifacts = hcCargoDeps.cargoArtifacts;

    # RUSTFLAGS = rustFlags;
    cargoExtraArgs = "";
    cargoBuildCommand =
      "cargo build --profile release --tests --offline --workspace";
    cargoCheckCommand = "";

    # CARGO_PROFILE = "release";
    doCheck = false;
    # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS =
    #   " -Clink-arg=-fuse-ld=mold";
    pname = "workspace-sweettest";
    version = cargoToml.package.version;
  };

in craneLib.cargoNextest {
  inherit buildInputs nativeBuildInputs src cargoArtifacts cargoVendorDir;
  pname = "${crate}-sweettest";
  version = cargoToml.package.version;

  # preCheck = ''
  #   export RUSTFLAGS="${rustFlags}"
  # '';

  # CARGO_PROFILE = "debug";

  cargoExtraArgs = "";
  # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS = " -Clink-arg=-fuse-ld=mold";
  cargoNextestExtraArgs = "-p ${crate} --offline -j 1";

  DNA_PATH = dna;
}

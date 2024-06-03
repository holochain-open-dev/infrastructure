{ dna, cargoArtifacts, buildInputs, nativeBuildInputs, workspacePath, craneLib
, crateCargoToml, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  workspaceCargoArtifacts =
    (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) {
      inherit cargoArtifacts buildInputs nativeBuildInputs src;

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
  inherit buildInputs nativeBuildInputs src;
  cargoArtifacts = workspaceCargoArtifacts;
  pname = "${crate}-sweettest";
  version = cargoToml.package.version;

  cargoExtraArgs = "";
  cargoNextestExtraArgs = "-p ${crate} --offline -j 1";

  DNA_PATH = dna;
}

{ dna, cargoArtifacts, buildInputs, nativeBuildInputs, workspacePath, craneLib
, crateCargoToml, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  commonArgs = {
    inherit cargoArtifacts buildInputs nativeBuildInputs src;
    strictDeps = true;
    CARGO_PROFILE = "release";
  };

  workspaceCargoArtifacts =
    (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) (commonArgs // {
      doCheck = false;
      pname = "workspace-sweettest";
      cargoExtraArgs = "--workspace --tests";
      version = cargoToml.package.version;
    });

in craneLib.cargoNextest (commonArgs // {
  cargoArtifacts = workspaceCargoArtifacts;
  pname = "${crate}-sweettest";
  version = cargoToml.package.version;

  cargoNextestExtraArgs = "-p ${crate} -j 1";

  DNA_PATH = dna;
})

{ dna, buildInputs, nativeBuildInputs, workspacePath, craneLib, crateCargoToml
, holochainCargoArtifacts, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  cargoArtifacts =
    craneLib.callPackage holochainCargoArtifacts { inherit src craneLib; };

in craneLib.cargoNextest {
  inherit buildInputs nativeBuildInputs src cargoArtifacts;
  version = "workspace";
  pname = "test";

  cargoNextestExtraArgs = "-p ${crate} --locked -j 1";

  DNA_PATH = dna;

  meta = { inherit cargoArtifacts; };
}

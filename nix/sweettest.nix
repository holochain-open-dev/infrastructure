{ pkgs, dna, buildInputs, nativeBuildInputs, workspacePath, craneLib
, crateCargoToml, holochainCargoDeps, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  holochainDeps = pkgs.callPackage holochainCargoDeps { inherit craneLib; };

  cargoArtifacts = holochainDeps.cargoArtifacts;
  cargoVendorDir = holochainDeps.cargoVendorDir;
in craneLib.cargoNextest {
  inherit buildInputs nativeBuildInputs;
  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
  version = "workspace";
  pname = "test";
  # strictDeps = true;

  inherit cargoArtifacts cargoVendorDir;
  cargoNextestExtraArgs = "-p ${crate} --locked -j 1";

  DNA_PATH = dna;
}

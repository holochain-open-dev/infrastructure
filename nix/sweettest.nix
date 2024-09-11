{ dna, lib, cargoArtifacts, buildInputs, workspacePath, craneLib, crateCargoToml
, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  commonArgs = {
    inherit cargoArtifacts buildInputs src;
    FIX_SQL_FMT = 1;
  };

  listCratesFromWorkspace = src:
    let
      allFiles = lib.filesystem.listFilesRecursive src;
      allCargoTomlsPaths =
        builtins.filter (path: lib.strings.hasSuffix "/Cargo.toml" path)
        allFiles;
      allCratesPaths =
        builtins.map (path: builtins.dirOf path) allCargoTomlsPaths;
      cratesCargoToml = builtins.map
        (path: builtins.fromTOML (builtins.readFile (path + "/Cargo.toml")))
        allCratesPaths;
      nonWorkspaceCrates =
        builtins.filter (toml: builtins.hasAttr "package" toml) cratesCargoToml;
      cratesNames = builtins.map (toml: toml.package.name) nonWorkspaceCrates;
    in cratesNames;
  packageList = listCratesFromWorkspace src;

  workspaceCargoArtifacts =
    (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) (commonArgs // {
      doCheck = false;
      cargoBuildCommand = "cargoWorkspace build --tests --locked";
      cargoExtraArgs = "";
      cargoCheckCommand = "";
      preBuild = ''
        cargoWorkspace() {
          command=$(shift)
          for package in ${builtins.toString packageList}; do
            (
              cargoWithProfile $command "$@" -p $package
            )
          done
        }
      '';

      pname = "workspace-sweettest";
      version = cargoToml.package.version;
    });

in craneLib.cargoNextest (commonArgs // {
  cargoArtifacts = workspaceCargoArtifacts;
  pname = "${crate}-test";
  version = cargoToml.package.version;

  cargoNextestExtraArgs = "-p ${crate} -j 1";

  DNA_PATH = dna;
})

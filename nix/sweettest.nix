{ pkgs, dna, lib, cargoArtifacts, buildInputs, nativeBuildInputs, workspacePath
, craneLib, crateCargoToml, ... }:
let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  commonArgs = { inherit cargoArtifacts buildInputs nativeBuildInputs src; };

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
  packages =
    builtins.toString (builtins.map (c: " --package ${c}") packageList);

  workspaceCargoArtifacts =
    (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) (commonArgs // {
      doCheck = false;
      cargoBuildCommand = "cargoWorkspace build --tests";
      cargoTestCommand = "cargoWorkspace test";
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
  # workspaceCargoArtifacts =
  #   (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { }) (commonArgs // {
  #     doCheck = false;
  #     cargoExtraArgs = "--workspace --locked --all-targets";

  #     pname = "workspace-sweettest";
  #     version = cargoToml.package.version;
  #   });

in craneLib.cargoNextest (commonArgs // {
  cargoArtifacts = workspaceCargoArtifacts;
  pname = "${crate}-test";
  version = cargoToml.package.version;

  # cargoTestArgs = "-p ${crate} -j 1";
  # cargoExtraArgs = "--locked";
  cargoNextestExtraArgs = "-p ${crate} -j 1";

  DNA_PATH = dna;
})

{ lib, workspacePath, referenceZomeCargoArtifacts, cargoArtifacts, pkgs
, runCommandLocal, runCommandNoCC, binaryen, deterministicCraneLib, craneLib
, crateCargoToml, nonWasmCrates }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  listBinaryCratesFromWorkspace = src:
    let
      isCrateZome = path:
        let
          hasSrc =
            lib.filesystem.pathIsDirectory (builtins.toString (path + "/src"));
          hasMain = hasSrc && (builtins.pathExists
            (builtins.toString (path + "/src/main.rs")));
          hasBinDir = hasSrc && (lib.filesystem.pathIsDirectory
            (builtins.toString (path + "/src/bin")));
        in hasSrc && !hasMain && !hasBinDir;

      allFiles = lib.filesystem.listFilesRecursive src;
      allCargoTomlsPaths =
        builtins.filter (path: lib.strings.hasSuffix "/Cargo.toml" path)
        allFiles;
      allCratesPaths =
        builtins.map (path: builtins.dirOf path) allCargoTomlsPaths;
      binaryCratesPaths =
        builtins.filter (cratePath: !(isCrateZome cratePath)) allCratesPaths;
      binaryCratesCargoToml = builtins.map
        (path: builtins.fromTOML (builtins.readFile (path + "/Cargo.toml")))
        binaryCratesPaths;
      binaryCratesWithoutWorkspace =
        builtins.filter (toml: builtins.hasAttr "package" toml)
        binaryCratesCargoToml;
      binaryCrates =
        builtins.map (toml: toml.package.name) binaryCratesWithoutWorkspace;
    in binaryCrates;

  nonWasmCrates = listBinaryCratesFromWorkspace src;
  excludedCrates =
    builtins.toString (builtins.map (c: " --exclude ${c}") nonWasmCrates);

  commonArgs = {
    inherit src;
    doCheck = false;
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    pname = "workspace";
    version = cargoToml.package.version;
    cargoBuildCommand =
      "cargo build --release --locked --workspace ${excludedCrates}";
    cargoCheckCommand = "";
    cargoExtraArgs = "";
  };

  buildPackageCommonArgs = commonArgs // {
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
  };

  zomeCargoArtifacts =
    (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
    (commonArgs // { inherit cargoArtifacts; });

  wasm = craneLib.buildPackage
    (buildPackageCommonArgs // { cargoArtifacts = zomeCargoArtifacts; });

  deterministicWasm = let
    zca = referenceZomeCargoArtifacts {
      system = pkgs.system;
      craneLib = deterministicCraneLib;
    };
    cargoArtifacts =
      (deterministicCraneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
      (commonArgs // { cargoArtifacts = zca; });

    wasm = deterministicCraneLib.buildPackage
      (buildPackageCommonArgs // { inherit cargoArtifacts; });
  in runCommandLocal "${crate}-deterministic" {
    meta = { holochainPackageType = "zome"; };
  } "	cp ${wasm}/lib/${crate}.wasm $out \n";

  release = runCommandLocal crate {
    meta = { holochainPackageType = "zome"; };
    buildInputs = [ binaryen ];
  } ''
    wasm-opt --strip-debug -Oz -o $out ${deterministicWasm}
  '';

  debug = runCommandLocal "${crate}-debug" {
    meta = {
      holochainPackageType = "zome";
      inherit release;
    };
  } ''
    cp ${wasm}/lib/${crate}.wasm $out 
  '';
in debug

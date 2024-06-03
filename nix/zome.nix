{ lib, workspacePath, zomeCargoDeps, pkgs, runCommandLocal, runCommandNoCC
, binaryen, deterministicCraneLib, craneLib, crateCargoToml, nonWasmCrates }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
  zomeDeps = zomeCargoDeps { inherit craneLib; };

  cargoVendorDir = craneLib.vendorCargoDeps { inherit src; };

  rustFlags = "";
  # RUSTFLAGS="--remap-path-prefix $(pwd)=/build/source/ --remap-path-prefix ${cargoVendorDir}=/build/source/ --remap-path-prefix ${zomeDeps.cargoVendorDir}=/build/source/"'';

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
    inherit src cargoVendorDir;
    doCheck = false;
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    pname = "workspace";
    version = cargoToml.package.version;
    cargoExtraArgs = "";
    cargoCheckCommand = "";
    cargoBuildCommand =
      "cargo build --profile release --offline --workspace ${excludedCrates}";
  };

  buildPackageCommonArgs = commonArgs // {
    cargoBuildCommand = "cargo build --profile release -p ${crate} --offline";
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
  };

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
    (commonArgs // { cargoArtifacts = zomeDeps.cargoArtifacts; });

  wasm = craneLib.buildPackage
    (buildPackageCommonArgs // { inherit cargoArtifacts; });

  deterministicWasm = let
    zomeDeps = zomeCargoDeps { craneLib = deterministicCraneLib; };
    cargoArtifacts =
      (deterministicCraneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
      (commonArgs // {
        cargoArtifacts = zomeDeps.cargoArtifacts;
        cargoBuildCommand = "${rustFlags} cargo build --profile release";
      });

    wasm = deterministicCraneLib.buildPackage
      (buildPackageCommonArgs // { inherit cargoArtifacts; });
  in runCommandLocal "${crate}-deterministic" {
    meta = { holochainPackageType = "zome"; };
  } "	cp ${wasm}/lib/${crate}.wasm $out \n";
  release = runCommandNoCC crate {
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

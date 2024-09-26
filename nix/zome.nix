{ lib, workspacePath, cargoArtifacts, runCommandLocal, runCommandNoCC, binaryen
, deterministicCraneLib, craneLib, crateCargoToml, matchingZomeHash ? null
, zome-wasm-hash, meta }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);

  listCratesPathsFromWorkspace = src:
    let

      allFiles = lib.filesystem.listFilesRecursive src;
      allCargoTomlsPaths =
        builtins.filter (path: lib.strings.hasSuffix "/Cargo.toml" path)
        allFiles;
      allCratesPaths =
        builtins.map (path: builtins.dirOf path) allCargoTomlsPaths;
    in allCratesPaths;

  listCratesNamesFromWorskspace = src:
    let
      allCratesPaths = listCratesPathsFromWorkspace src;
      cratesCargoToml = builtins.map
        (path: builtins.fromTOML (builtins.readFile (path + "/Cargo.toml")))
        allCratesPaths;
      cratesWithoutWorkspace =
        builtins.filter (toml: builtins.hasAttr "package" toml) cratesCargoToml;
      cratesNames =
        builtins.map (toml: toml.package.name) cratesWithoutWorkspace;
    in cratesNames;

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

      allCratesPaths = listCratesPathsFromWorkspace src;
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

  allCratesNames = listCratesNamesFromWorskspace src;

  workspaceName = if builtins.length allCratesNames > 0 then
    builtins.elemAt allCratesNames 0
  else
    "";

  commonArgs = {
    inherit src;
    doCheck = false;
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    pname = "${workspaceName}-workspace";
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
    cargoArtifacts = deterministicCraneLib.buildDepsOnly (commonArgs // { });

    wasm = deterministicCraneLib.buildPackage
      (buildPackageCommonArgs // { inherit cargoArtifacts; });
  in runCommandLocal "${crate}-deterministic" {
    meta = { holochainPackageType = "zome"; };
  } "	cp ${wasm}/lib/${crate}.wasm $out \n";

  debug = runCommandNoCC "${crate}-debug" { } ''
    cp ${wasm}/lib/${crate}.wasm $out 
  '';

  release = runCommandLocal crate { buildInputs = [ binaryen ]; } ''
    wasm-opt --strip-debug -Oz -o $out ${deterministicWasm}
  '';

  guardedRelease = if matchingZomeHash != null then
    runCommandLocal "check-zome-${crate}-hash" {
      srcs = [ release matchingZomeHash.meta.release ];
      buildInputs = [ zome-wasm-hash ];
    } ''
      ORIGINAL_HASH=$(zome-wasm-hash ${matchingZomeHash.meta.release})
      NEW_HASH=$(zome-wasm-hash ${release})

      if [[ "$ORIGINAL_HASH" != "$NEW_HASH" ]]; then
        echo "The hash for the new ${crate} zome does not match the hash of the original zome"
        exit 1
      fi

      cp ${release} $out
    ''
  else
    release;

in runCommandNoCC crate {
  meta = meta // { inherit debug; };
  outputs = [ "out" "hash" ];
  buildInputs = [ zome-wasm-hash ];
} ''
  cp ${guardedRelease} $out
  zome-wasm-hash $out > $hash
''

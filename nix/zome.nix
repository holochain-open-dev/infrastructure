{ zomeCargoArtifacts, pkgs, runCommandLocal, runCommandNoCC, binaryen
, deterministicCraneLib, craneLib, workspacePath, crateCargoToml }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
  zomeDepsCargoArtifacts = zomeCargoArtifacts { inherit craneLib; };

  commonArgs = {
    doCheck = false;
    inherit src;
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    pname = "workspace";
    version = cargoToml.package.version;
    cargoExtraArgs = "--offline";
    cargoBuildCommand = ''
      RUSTFLAGS="--remap-path-prefix $(pwd)=/build/source/" cargo build --profile release'';
  };

  buildPackageCommonArgs = commonArgs // {
    cargoExtraArgs = "-p ${crate} --offline";
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
    cargoLock = workspacePath + /Cargo.lock;
  };

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
    (commonArgs // { cargoArtifacts = zomeDepsCargoArtifacts; });

  wasm = craneLib.buildPackage
    (buildPackageCommonArgs // { inherit cargoArtifacts; });

  deterministicWasm = let
    zomeDepsCargoArtifacts =
      zomeCargoArtifacts { craneLib = deterministicCraneLib; };
    cargoArtifacts =
      (deterministicCraneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
      (commonArgs // { cargoArtifacts = zomeDepsCargoArtifacts; });

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

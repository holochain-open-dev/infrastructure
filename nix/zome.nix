{ zomeCargoArtifacts, pkgs, runCommandLocal, runCommandNoCC, binaryen
, deterministicCraneLib, craneLib, workspacePath, crateCargoToml }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
  commonArgs = {
    doCheck = false;
    inherit src;
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    cargoExtraArgs = "-p ${crate} --locked";
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
    cargoLock = workspacePath + /Cargo.lock;
  };

  wasm = craneLib.buildPackage (commonArgs // {
    cargoArtifacts = zomeCargoArtifacts { inherit craneLib src; };
  });

  deterministicWasm = let
    wasm = deterministicCraneLib.buildPackage (commonArgs // {
      cargoArtifacts = zomeCargoArtifacts {
        inherit src;
        craneLib = deterministicCraneLib;
      };
    });
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

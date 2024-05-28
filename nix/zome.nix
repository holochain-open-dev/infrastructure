{ pkgs, runCommandLocal, runCommandNoCC, binaryen, deterministicCraneLib
, craneLib, workspacePath, crateCargoToml, zomeCargoDeps }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  commonArgs = {
    strictDeps = true;
    doCheck = false;
    src = craneLib.cleanCargoSource (craneLib.path workspacePath);
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    cargoLock = workspacePath + /Cargo.lock;
    cargoExtraArgs = "-p ${crate} --locked";
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
  };

  cargoVendorDir = craneLib.vendorMultipleCargoDeps {
    cargoLockList =
      [ ./reference-happ/Cargo.lock (workspacePath + /Cargo.lock) ];
  };

  wasm = craneLib.buildPackage (commonArgs // {
    cargoArtifacts = (zomeCargoDeps { inherit craneLib; }).cargoArtifacts;
    inherit cargoVendorDir;
    # = (zomeCargoDeps { inherit craneLib; }).cargoVendorDir;
  });

  deterministicWasm = let
    wasm = deterministicCraneLib.buildPackage (commonArgs // {
      cargoArtifacts =
        (zomeCargoDeps { craneLib = deterministicCraneLib; }).cargoArtifacts;
      cargoVendorDir =
        (zomeCargoDeps { craneLib = deterministicCraneLib; }).cargoVendorDir;
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

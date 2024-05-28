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
  };

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
    (commonArgs // {
      pname = crate;
      version = "deps";

      cargoVendorDir = (zomeCargoDeps { inherit craneLib; }).cargoVendorDir;
      cargoArtifacts = (zomeCargoDeps { inherit craneLib; }).cargoArtifacts;
    });

  buildPackageCommonArgs = commonArgs // {
    cargoExtraArgs = "-p ${crate} --locked";
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
  };

  wasm = craneLib.buildPackage (buildPackageCommonArgs // {
    cargoVendorDir = (zomeCargoDeps { inherit craneLib; }).cargoVendorDir;
    inherit cargoArtifacts;
    # inherit cargoVendorDir;
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

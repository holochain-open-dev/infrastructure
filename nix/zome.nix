{ zomeCargoDeps, pkgs, runCommandLocal, runCommandNoCC, binaryen
, deterministicCraneLib, craneLib, workspacePath, crateCargoToml }:

let
  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
  zomeDeps = zomeCargoDeps { inherit craneLib; };

  cargoVendorDir = craneLib.vendorCargoDeps { inherit src; };

  rustFlags = ''
    RUSTFLAGS="--remap-path-prefix $(pwd)=/build/source/ --remap-path-prefix ${cargoVendorDir}=/build/source/ --remap-path-prefix ${zomeDeps.cargoVendorDir}=/build/source/"'';

  commonArgs = {
    inherit src cargoVendorDir;
    doCheck = false;
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    pname = "workspace";
    version = cargoToml.package.version;
    cargoExtraArgs = "--offline";
    cargoBuildCommand = "${rustFlags} cargo build --profile release";
  };

  buildPackageCommonArgs = commonArgs // {
    cargoExtraArgs = "-p ${crate} --offline";
    pname = crate;
    version = cargoToml.package.version;
    cargoToml = crateCargoToml;
    cargoLock = workspacePath + /Cargo.lock;
  };

  cargoArtifacts = (craneLib.callPackage ./buildDepsOnlyWithArtifacts.nix { })
    (commonArgs // { cargoArtifacts = zomeDeps.cargoArtifacts; });

  wasm = craneLib.buildPackage
    (buildPackageCommonArgs // { inherit cargoArtifacts; });

  deterministicWasm = let
    cargoVendorDir = deterministicCraneLib.vendorCargoDeps { inherit src; };
    zomeDeps = zomeCargoDeps { craneLib = deterministicCraneLib; };
    rustFlags = ''
      RUSTFLAGS="--remap-path-prefix $(pwd)=/build/source/ --remap-path-prefix ${cargoVendorDir}=/build/source/ --remap-path-prefix ${zomeDeps.cargoVendorDir}=/build/source/"'';

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

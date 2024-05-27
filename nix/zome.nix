{ runCommandLocal, runCommandNoCC, binaryen, deterministicCraneLib, craneLib
, workspacePath, system, lib, pkgs, crateCargoToml, excludedCrates }:

let
  cargoExtraArgs = "--workspace ${
      if excludedCrates != null then
        builtins.concatStringsSep " "
        (builtins.map (excludedCrate: "--exclude ${excludedCrate}")
          excludedCrates)
      else
        ""
    }";

  cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

  commonArgs = {
    strictDeps = true;
    doCheck = false;
    src = craneLib.cleanCargoSource (craneLib.path workspacePath);
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
  };

  wasmDeps = craneLib.buildDepsOnly (commonArgs // {
    inherit cargoExtraArgs;
    pname = "happ-workspace";
    version = "workspace";
  });
  wasm = craneLib.buildPackage (commonArgs // {
    cargoToml = crateCargoToml;
    cargoLock = workspacePath + /Cargo.lock;
    cargoArtifacts = wasmDeps;
    cargoExtraArgs = "-p ${crate} --locked";
    pname = crate;
    version = cargoToml.package.version;
  });
  debug = runCommandLocal "${crate}-debug" {
    meta = { holochainPackageType = "zome"; };
  } "cp ${wasm}/lib/${crate}.wasm $out \n";

  deterministicWasm = let
	wasmDeps = deterministicCraneLib.buildDepsOnly (commonArgs // {
            inherit cargoExtraArgs;
            pname = "happ-workspace";
            version = "workspace";
          });

    wasm = deterministicCraneLib.buildPackage (commonArgs // {
        cargoArtifacts = wasmDeps;
		      cargoToml = crateCargoToml;
      cargoLock = workspacePath + /Cargo.lock;
      cargoExtraArgs = "-p ${crate} --locked";
      pname = crate;
      version = cargoToml.package.version;
      });
  in runCommandLocal "${crate}-deterministic" {
    meta = { holochainPackageType = "zome"; };
  } "	cp ${wasm}/lib/${crate}.wasm $out \n";
in runCommandNoCC crate {
  meta = {
    inherit debug;
    holochainPackageType = "zome";
  };
  buildInputs = [ binaryen ];
} "wasm-opt --strip-debug -Oz -o $out ${deterministicWasm}\n"

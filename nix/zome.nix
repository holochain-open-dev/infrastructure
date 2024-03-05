{ 
	runCommandLocal,
	runCommandNoCC,
	binaryen,
  craneLib,
  workspacePath,
	cargoTomlPath,
	excludedCrates
}:

let 
	cargoExtraArgs = "--workspace ${if excludedCrates != null then builtins.concatStringsSep " " (builtins.map (excludedCrate: ''--exclude ${excludedCrate}'') excludedCrates) else ''''}";

	cargoToml = builtins.fromTOML (builtins.readFile cargoTomlPath);
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
		cargoToml = cargoTomlPath;
		cargoLock = workspacePath + /Cargo.lock;
		cargoArtifacts = wasmDeps;
		cargoExtraArgs = "-p ${crate} --locked";
	  pname = crate;
		version = cargoToml.package.version;
	});
	debug = runCommandLocal "${crate}-debug" {
		meta = {
			holochainPackageType = "zome";
		};
	} ''
		cp ${wasm}/lib/${crate}.wasm $out 
	'';
in
	runCommandNoCC crate {
		meta = {
			inherit debug;
			holochainPackageType = "zome";
		};
	} ''
	  ${binaryen}/bin/wasm-opt --strip-debug -Oz -o $out ${debug}
	''

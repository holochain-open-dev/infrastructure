{ 
	runCommandLocal,
	runCommandNoCC,
	binaryen,
	callPackage,
  craneLib,
  workspacePath,
	crateCargoToml,
	excludedCrates
}:

let 
	cargoExtraArgs = "-Z avoid-dev-deps --workspace ${if excludedCrates != null then builtins.concatStringsSep " " (builtins.map (excludedCrate: ''--exclude ${excludedCrate}'') excludedCrates) else ''''}";

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
		cargoExtraArgs = "-p ${crate} --locked -v";
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
 #  callPackage ./deterministic-zome.nix {
 #    inherit workspacePath crateCargoToml;
	# 	meta = {
	# 		inherit debug;
	# 		holochainPackageType = "zome";
	# 	};
	# }
	runCommandNoCC crate {
		meta = {
			inherit debug;
			holochainPackageType = "zome";
		};
		buildInputs = [ binaryen ];
	} ''
	  wasm-opt --strip-debug -Oz -o $out ${debug}
	''

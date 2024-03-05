{ 
	stdenv,
	binaryen,
  craneLib,
  workspacePath,
	cratePath,
	excludedCrates,
	optimizeWasm
}:

let 
	cargoExtraArgs = "--workspace ${if excludedCrates != null then builtins.concatStringsSep " " (builtins.map (excludedCrate: ''--exclude ${excludedCrate}'') excludedCrates) else ''''}";

	cargoToml = cratePath + /Cargo.toml;
	crateToml = builtins.fromTOML (builtins.readFile cargoToml);
  crate = crateToml.package.name;

  wasmDeps = craneLib.buildDepsOnly {
		inherit cargoExtraArgs;
	  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		doCheck = false;
	};
	wasm = craneLib.buildPackage {
		inherit cargoToml;
	  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
		cargoLock = workspacePath + /Cargo.lock;
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		cargoArtifacts = wasmDeps;
		cargoExtraArgs = "-p ${crate} --locked";
	  pname = crate;
		doCheck = false;
	};
	optimizedWasm = stdenv.mkDerivation {
	  name = "${crate}-optimized";
		buildInputs = [ wasm binaryen ];
		phases = [ "buildPhase" ];
		buildPhase = ''
		  wasm-opt --strip-debug -Oz -o $out ${wasm}/lib/${crate}.wasm
 		'';
	};
in
  stdenv.mkDerivation {
	  name = crate;
		buildInputs = [ optimizedWasm ];
		phases = [ "buildPhase" ];
		buildPhase = ''
		  cp ${wasm}/lib/${crate}.wasm $out 
 		'';
		meta = {
			holochainPackageType = "zome";
			debug = stdenv.mkDerivation {
			  name = "${crate}-debug";
				buildInputs = [ optimizedWasm ];
				phases = [ "buildPhase" ];
				buildPhase = ''
				  cp ${wasm}/lib/${crate}.wasm $out 
		 		'';
				meta = {
					holochainPackageType = "zome";
				};
			};
		};
	}

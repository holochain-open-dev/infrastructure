{ 
	crate,
	stdenv,
	binaryen,
  craneLib,
  workspacePath,
	excludedCrates,
	optimizeWasm
}:

let 
	cargoExtraArgs = "--workspace ${if excludedCrates != null then builtins.concatStringsSep " " (builtins.map (excludedCrate: ''--exclude ${excludedCrate}'') excludedCrates) else ''''}";
  wasmDeps = craneLib.buildDepsOnly {
		inherit cargoExtraArgs;
	  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		doCheck = false;
	};
	wasm = craneLib.buildPackage {
	  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		cargoArtifacts = wasmDeps;
		cargoExtraArgs = "-p ${crate} --locked";
	  pname = crate;
		doCheck = false;
	};
in
  if optimizeWasm then
	  stdenv.mkDerivation {
		  name = crate;
			buildInputs = [ wasm binaryen ];
			phases = [ "buildPhase" ];
			buildPhase = ''
			  wasm-opt --strip-debug -Oz -o $out ${wasm}/lib/${crate}.wasm
	 		'';
		}
	else
	  stdenv.mkDerivation {
		  name = crate;
			buildInputs = [ wasm ];
			phases = [ "buildPhase" ];
			buildPhase = ''
			  cp ${wasm}/lib/${crate}.wasm $out 
	 		'';
		}

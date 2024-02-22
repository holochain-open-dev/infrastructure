{ 
	crate,
	stdenv,
	binaryen,
  craneLib,
  src,
	excludedCrates ? []
}:

let 
	cargoExtraArgs = "--workspace ${if excludedCrates != null then builtins.concatStringsSep " " (builtins.map (excludedCrate: ''--exclude ${excludedCrate}'') excludedCrates) else ''''}";
  wasmDeps = craneLib.buildDepsOnly {
		inherit src cargoExtraArgs;
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		doCheck = false;
	};
	wasm = craneLib.buildPackage {
		inherit src cargoExtraArgs;
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		cargoArtifacts = wasmDeps;
	  pname = crate;
		doCheck = false;
	};
in
  stdenv.mkDerivation {
	  name = crate;
		buildInputs = [ wasm binaryen ];
		phases = [ "buildPhase" ];
		buildPhase = ''
		  wasm-opt --strip-debug -Oz -o $out ${wasm}/lib/${crate}.wasm
 		'';
	}

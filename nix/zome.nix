{ 
	crate,
	stdenv,
	binaryen,
  craneLib,
  src,
	cargoExtraArgs ? "--locked"
}:

let 
  wasmDeps = craneLib.buildDepsOnly {
		inherit src cargoExtraArgs;
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
	  CARGO_PROFILE = "release";
		doCheck = false;
	};
	wasm = craneLib.buildPackage {
	  inherit src cargoExtraArgs;
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
	  CARGO_PROFILE = "release";
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

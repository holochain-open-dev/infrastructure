{ 
	crate,
	stdenv,
	binaryen,
  craneLib,
  src,
	version
}:

let 
	wasm = craneLib.buildPackage {
	  inherit src version;
	  cargoExtraArgs = "-p ${crate}";
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
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

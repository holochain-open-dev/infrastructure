{ 
	runCommandLocal,
	runCommandNoCC,
	binaryen,
  craneLib,
  workspacePath,
	crateCargoToml,
	writeShellScript,
	excludedCrates
}:

let 
	cargoExtraArgs = "-Z avoid-dev-deps --workspace ${if excludedCrates != null then builtins.concatStringsSep " " (builtins.map (excludedCrate: ''--exclude ${excludedCrate}'') excludedCrates) else ''''}";

	cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;

	# rustcWrapper = writeShellScript "rustc-wrapper.sh" (builtins.readFile ./rustc-wrapper.sh);

	commonArgs = {
		strictDeps = true;
		doCheck = false;
	  src = craneLib.cleanCargoSource (craneLib.path workspacePath);
	  CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
		# CARGO_BUILD_RUSTFLAGS = "";
		# RUSTC_WRAPPER = rustcWrapper;
	};
	
  wasmDeps = craneLib.buildDepsOnly (commonArgs // {
		inherit cargoExtraArgs;
		pname = "happ-workspace";
		version = "workspace";
	});
	wasm = craneLib.buildPackage (commonArgs // {
		cargoToml = crateCargoToml;
		cargoLock = workspacePath + /Cargo.lock;
		# cargoArtifacts = wasmDeps;
		cargoExtraArgs = "-p ${crate} --locked -v";
		# cargoBuildCommand = "cargo rustc --profile release -- -C metadata=${cratePath}/src/lib.rs";
		# cargoBuildCommand = "rustc -vv --crate-name ${crate} --edition=2021 ${workspacePath}/zome/src/lib.rs --error-format=json --json=diagnostic-rendered-ansi,artifacts,future-incompat --crate-type cdylib --crate-type rlib --emit=dep-info,link -C opt-level=z -C embed-bitcode=no -Zunstable-options -Zremap-path-scope=all --remap-path-prefix=/build/source=. --out-dir /build/source/target/wasm32-unknown-unknown/release/deps --target wasm32-unknown-unknown -L dependency=/build/source/target/wasm32-unknown-unknown/release/deps -L dependency=/build/source/target/release/deps --extern hdk=/build/source/target/wasm32-unknown-unknown/release/deps/libhdk-958f0c3891df457c.rlib --extern serde=/build/source/target/wasm32-unknown-unknown/release/deps/libserde-7c4f086b3ce3ca72.rlib";
		# installPhaseCommand = "";
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

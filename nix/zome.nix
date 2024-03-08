{ 
	pkgs,
	runCommandLocal,
	runCommandNoCC,
	binaryen,
  deterministicCraneLib,
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

	deterministicWasm = 
	let 
	  wasmDeps = deterministicCraneLib.buildDepsOnly (commonArgs // {
			inherit cargoExtraArgs;
			pname = "happ-workspace";
			version = "workspace";
		});

  #   wasm = deterministicCraneLib.buildPackage (commonArgs // {
		# 	cargoToml = crateCargoToml;
		# 	cargoLock = workspacePath + /Cargo.lock;
		# 	cargoArtifacts = wasmDeps;
		# 	cargoBuildCommand = "mkdir /build/vendor && cd $cargoVendorDir   && echo '${builtins.readFile ./vendored-sources-config.toml}' > /build/source/.cargo-home/config.toml && cat /build/source/.cargo-home/config.toml && cargo build --profile release -v";
		# 	cargoExtraArgs = "-p ${crate} --locked";
		#   pname = crate;
		# 	version = cargoToml.package.version;
		# });
	  rustToolchain = pkgs.rust-bin.stable.latest.minimal.override {
	    # Set the build targets supported by the toolchain,
	    # wasm32-unknown-unknown is required for trunk.
	    targets = [ "wasm32-unknown-unknown" ];
	  };
		rustPlatform = pkgs.makeRustPlatform {
	    cargo = rustToolchain;
	    rustc = rustToolchain;
		};

		wasm = rustPlatform.buildRustPackage {
			nativeBuildInputs = [
				pkgs.llvmPackages.bintools
			];
	    src = workspacePath;
			pname = crate;
			version = cargoToml.package.version;
			cargoLock = {
				lockFile = "${workspacePath}/Cargo.lock";
			};
			cargoBuildFlags = "--target wasm32-unknown-unknown";
			doCheck = false;
			CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_LINKER = "lld";
	    installPhase = ''
	      mkdir -p $out/lib
	      cp target/wasm32-unknown-unknown/release/*.wasm $out/lib/
	    '';
		};
	in
		runCommandLocal "${crate}-deterministic" {
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
		buildInputs = [ binaryen ];
	} ''
	  wasm-opt --strip-debug -Oz -o $out ${deterministicWasm}
	''

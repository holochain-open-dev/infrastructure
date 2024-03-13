{
  inputs = {
    crane.url = "github:ipetkov/crane";

    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs = {
        nixpkgs.follows = "nixpkgs";
      };
    };
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
		hcUtils.url = "github:holochain-open-dev/common";
  };

  nixConfig = {
		extra-substituters = [
	    "https://holochain-open-dev.cachix.org"
	  ];	
		extra-trusted-public-keys = [
			"holochain-open-dev.cachix.org-1:3Tr+9in6uo44Ga7qiuRIfOTFXog+2+YbyhwI/Z6Cp4U="
	  ];
	};

  outputs = inputs @ { ... }:
	  let
		  replaceNpmDependenciesSources = system:
			  let
					craneLib = inputs.crane.lib.${system};

					cratePath = ./crates/replace-npm-dependencies-sources;

					cargoToml = builtins.fromTOML (builtins.readFile "${cratePath}/Cargo.toml");
				  crate = cargoToml.package.name;

					commonArgs = {
						strictDeps = true;
						doCheck = false;
					  src = craneLib.cleanCargoSource (craneLib.path cratePath);
					};
				in 
					craneLib.buildPackage (commonArgs // {
					  pname = crate;
						version = cargoToml.package.version;
					});
		in
	    inputs.holochain.inputs.flake-parts.lib.mkFlake
	      {
	        inherit inputs;
	      }
	      {
				  flake = {
						lib = rec {
						  filterByHolochainPackageType = holochainPackageType: packages: inputs.nixpkgs.lib.filterAttrs (key: value: (builtins.hasAttr "meta" value) && (builtins.hasAttr "holochainPackageType" value.meta) && value.meta.holochainPackageType == holochainPackageType) packages; 

							filterZomes = filterByHolochainPackageType "zome";
							filterDnas = filterByHolochainPackageType "dna";
							filterHapps = filterByHolochainPackageType "happ";
							filterNpmPackages = filterByHolochainPackageType "npm";

							rustZome = { crateCargoToml, holochain,  workspacePath, excludedCrates ? [] }: 
								let 
								  deterministicCraneLib = let 
										system = "x86_64-linux";
									  pkgs = import inputs.nixpkgs {
									    inherit system;
									    overlays = [ (import inputs.rust-overlay) ];
									  };

									  rustToolchain = pkgs.rust-bin.stable."1.75.0".minimal.override {
									    # Set the build targets supported by the toolchain,
									    # wasm32-unknown-unknown is required for trunk.
									    targets = [ "wasm32-unknown-unknown" ];
									  };
									in
						        inputs.crane.lib.${system}.overrideToolchain rustToolchain;

								  system = holochain.legacyPackages.cowsay.system;
								  pkgs = import inputs.nixpkgs {
								    inherit system;
								    overlays = [ (import inputs.rust-overlay) ];
								  };

								  rustToolchain = pkgs.rust-bin.stable."1.75.0".minimal.override {
								    # Set the build targets supported by the toolchain,
								    # wasm32-unknown-unknown is required for trunk.
								    targets = [ "wasm32-unknown-unknown" ];
								  };
						      craneLib = inputs.crane.lib.${system}.overrideToolchain rustToolchain;

								in
									pkgs.callPackage ./nix/zome.nix {
						        inherit deterministicCraneLib craneLib crateCargoToml excludedCrates workspacePath;
									};
							sweettest = { holochain, dna, workspacePath, crateCargoToml }: 
							  let
								  system = holochain.devShells.holonix.system;
								  pkgs = import inputs.nixpkgs {
								    inherit system;
								    overlays = [ (import inputs.rust-overlay) ];
								  };
								  rustToolchain = pkgs.rust-bin.stable."1.75.0".minimal.override {
								    # Set the build targets supported by the toolchain,
								    # wasm32-unknown-unknown is required for trunk.
								    targets = [ "wasm32-unknown-unknown" ];
								  };
						      craneLib = inputs.crane.lib.${system}.overrideToolchain rustToolchain;
								in pkgs.callPackage ./nix/sweettest.nix {
									inherit holochain dna craneLib workspacePath crateCargoToml;
								};
							dna = { holochain, dnaManifest, zomes }: 
								let 
								  system = holochain.devShells.holonix.system;
								  pkgs = import inputs.nixpkgs {
								    inherit system;
								    overlays = [ (import inputs.rust-overlay) ];
								  };
								in
									pkgs.callPackage ./nix/dna.nix {
						        inherit zomes holochain dnaManifest;
						      };
							happ = { holochain, happManifest, dnas }: 
								let 
								  system = holochain.devShells.holonix.system;
								  pkgs = import inputs.nixpkgs {
								    inherit system;
								    overlays = [ (import inputs.rust-overlay) ];
								  };
								in
									pkgs.callPackage ./nix/happ.nix {
						        inherit dnas holochain happManifest;
						      };
							npmPackage = { system, workspacePath, rootPath }: 
								let 
								  pkgs = import inputs.nixpkgs {
								    inherit system;
								    overlays = [ (import inputs.rust-overlay) ];
								  };
								in
									pkgs.callPackage ./nix/npm-package.nix {
						        inherit workspacePath rootPath;
						      };
	            syncNpmDependenciesWithNix = { system, holochainPackages }: 
							  let
								  pkgs = import inputs.nixpkgs {
								    inherit system;
								  };
								in 
									pkgs.writeShellScriptBin "sync-npm-dependencies-with-nix" ''
			            ${replaceNpmDependenciesSources system}/bin/replace-npm-dependencies-sources \
			              ${builtins.toString (
			                builtins.map (p: "${p.meta.packageName}=file:${p.outPath}/lib") 
			                (builtins.attrValues (holochainPackages))
			              )}
				          '';
				      };
					};

	        systems = builtins.attrNames inputs.holochain.devShells;
	        perSystem =
	          { inputs'
	          , config
	          , pkgs
	          , system
	          , lib
	          , ...
	          }: {

	            devShells.default = pkgs.mkShell {
	              inputsFrom = [ inputs'.holochain.devShells.holonix ];
	              packages = with pkgs; [
	                nodejs-18_x
	                # more packages go here
	                cargo-nextest
	              ];
	            };

							packages.replace-npm-dependencies-sources = replaceNpmDependenciesSources system;
	          };
	      };
}

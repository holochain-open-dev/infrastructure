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

						rustZome = { crateCargoToml,  workspacePath, excludedCrates ? [] }: 
							let 
							  system = "x86_64-linux";
							  pkgs = import inputs.nixpkgs {
							    inherit system;
							    overlays = [ (import inputs.rust-overlay) ];
							  };

							  rustToolchain = pkgs.rust-bin.nightly."2024-01-29".minimal.override {
							    # Set the build targets supported by the toolchain,
							    # wasm32-unknown-unknown is required for trunk.
							    targets = [ "wasm32-unknown-unknown" ];
							  };
					      craneLib = inputs.crane.lib.${system}.overrideToolchain rustToolchain;

							in
								pkgs.callPackage ./nix/zome.nix {
					        inherit craneLib crateCargoToml excludedCrates workspacePath;
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
              inputsFrom = [ ];
              packages = with pkgs; [
                nodejs-18_x
                # more packages go here
                cargo-nextest
							(let 

							  pkgs = import inputs.nixpkgs {
							    inherit system;
							    overlays = [ (import inputs.rust-overlay) ];
							  };

							  rustToolchain = pkgs.rust-bin.nightly."2024-01-29".minimal.override {
							    # Set the build targets supported by the toolchain,
							    # wasm32-unknown-unknown is required for trunk.
							    targets = [ "wasm32-unknown-unknown" ];
							  };
						in
							 rustToolchain)
              ];
            };
          };
      };
}

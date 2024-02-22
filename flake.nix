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

  outputs = inputs @ { ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
			  flake = {
					lib = {
						rustZome = { src, crate, holochain, cargoExtraArgs ? "--locked" }: 
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

							in
								pkgs.callPackage ./nix/zome.nix {
					        inherit src craneLib crate;
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
					        inherit dnaManifest zomes holochain;
					      };
						happ = { holochain, happManifest, dnas }: 
							let 
							  system = builtins.trace holochain holochain.system;
							  pkgs = import inputs.nixpkgs {
							    inherit system;
							    overlays = [ (import inputs.rust-overlay) ];
							  };
							in
								pkgs.callPackage ./nix/happ.nix {
					        inherit happManifest dnas holochain;
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
              inputsFrom = [ inputs'.holochain.devShells.holonix ];
              packages = with pkgs; [
                nodejs-18_x
                # more packages go here
                cargo-nextest
              ];
            };
          };
      };
}

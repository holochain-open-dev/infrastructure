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
          }: rec {

            devShells.default = pkgs.mkShell {
              inputsFrom = [ inputs'.holochain.devShells.holonix ];
              packages = with pkgs; [
                nodejs_20
                # more packages go here
              ];
            };

						devShells.synchronized-pnpm = pkgs.mkShell {
							packages = [
								(pkgs.writeShellScriptBin "npm" ''
                  echo "
                  ERROR: this repository is not managed with npm, but pnpm.

									Don't worry! They are really similar to each other. Here are some helpful reminders:
                  
                  If you are trying to run \`npm install\`, you can run \`pnpm install\`
                  If you are trying to run \`npm install some_dependency\`, you can run \`pnpm add some_dependency\`
                  If you are trying to run a script like \`npm run build\`, you can run \`pnpm build\`
                  If you are trying to run a script for a certain workspace like \`npm run build -w ui\`, you can run \`pnpm -F ui build\`"
                '')
                pkgs.nodejs_20
                packages.pnpm
                packages.sync-npm-git-dependencies-with-nix
							];

              shellHook = ''
                sync-npm-git-dependencies-with-nix
              '';
						};

						packages.sync-npm-git-dependencies-with-nix = 
						  let
								craneLib = inputs.crane.lib.${system};

								cratePath = ./crates/sync-npm-git-dependencies-with-nix;

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

            packages.pnpm = pkgs.stdenv.mkDerivation {
              pname ="pnpm";
              version ="pnpm-9";
              buildInputs = [ pkgs.nodejs_20 ];
              phases = ["installPhase"];
              installPhase = ''
                mkdir -p $out/bin
                corepack enable pnpm --install-directory=$out/bin
              '';
            };
          };
      };
}

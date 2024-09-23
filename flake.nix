rec {
  inputs = {
    nixpkgs.follows = "holonix/nixpkgs";
    pnpmnixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";

    holonix.url = "github:holochain/holonix";
    rust-overlay.follows = "holonix/rust-overlay";
    crane.follows = "holonix/crane";
  };

  nixConfig = {
    extra-substituters = [ "https://holochain-open-dev.cachix.org" ];
    extra-trusted-public-keys = [
      "holochain-open-dev.cachix.org-1:3Tr+9in6uo44Ga7qiuRIfOTFXog+2+YbyhwI/Z6Cp4U="
    ];
  };

  outputs = inputs@{ ... }:
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; } rec {
      flake = {
        lib = rec {
          holochainDeps = { pkgs, lib }:
            (with pkgs; [ perl openssl ])
            ++ (lib.optionals pkgs.stdenv.isLinux [ pkgs.pkg-config pkgs.go ])
            ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
              pkgs.libiconv

              pkgs.darwin.apple_sdk.frameworks.AppKit
              pkgs.darwin.apple_sdk.frameworks.WebKit
              (pkgs.darwin.apple_sdk_11_0.stdenv.mkDerivation {
                name = "go";
                nativeBuildInputs = with pkgs; [ makeBinaryWrapper go ];
                dontBuild = true;
                dontUnpack = true;
                installPhase = ''
                  makeWrapper ${pkgs.go}/bin/go $out/bin/go
                '';
              })

            ]);

          zomeCargoArtifacts = { system, craneLib ? (let
            pkgs = import inputs.nixpkgs {
              inherit system;
              overlays = [ (import inputs.rust-overlay) ];
            };
            craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
              inputs.holonix.outputs.packages.${system}.rust;
          in craneLib), debug ? false }:
            let
              src =
                craneLib.cleanCargoSource (craneLib.path ./nix/reference-happ);
              commonArgs = {
                inherit src;
                doCheck = false;
                CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
              };
              cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
                pname = "zome";
                version = "for-holochain-0.4";
              });

            in cargoArtifacts;

          holochainCargoArtifacts = { system }:
            let
              pkgs = import inputs.nixpkgs {
                inherit system;
                overlays = [ (import inputs.rust-overlay) ];
              };
              craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
                inputs.holonix.outputs.packages.${system}.rust;

              buildInputs = holochainDeps {
                inherit pkgs;
                lib = pkgs.lib;
              };
              cargoArtifacts = craneLib.buildDepsOnly {
                inherit buildInputs;
                src = craneLib.cleanCargoSource
                  (craneLib.path ./nix/reference-happ);
                doCheck = false;
                # RUSTFLAGS =
                #   "--remap-path-prefix ${cargoVendorDir}=/build/source/";
                # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS =
                #   " -Clink-arg=-fuse-ld=mold";
                # CARGO_PROFILE = "release";
                CARGO_PROFILE = "release";
                pname = "sweettest";
                version = "for-holochain-0.4.0";
              };
            in cargoArtifacts;

          rustZome = { crateCargoToml, system, workspacePath
            , cargoArtifacts ? null, matchingZomeHash ? null }:
            let
              pkgs = import inputs.nixpkgs {
                inherit system;
                overlays = [ (import inputs.rust-overlay) ];
              };
              deterministicCraneLib = let
                rustToolchain =
                  inputs.holonix.outputs.packages."x86_64-linux".rust;
              in (inputs.crane.mkLib pkgs).overrideToolchain rustToolchain;

              craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
                inputs.holonix.outputs.packages.${system}.rust;
              zome-wasm-hash =
                (outputs inputs).packages.${system}.zome-wasm-hash;

            in pkgs.callPackage ./nix/zome.nix {
              inherit deterministicCraneLib craneLib crateCargoToml
                cargoArtifacts workspacePath matchingZomeHash zome-wasm-hash;
            };
          sweettest = { system, dna, workspacePath, crateCargoToml
            , buildInputs ? [ ], nativeBuildInputs ? [ ], cargoArtifacts ? null
            }:
            let
              pkgs = import inputs.nixpkgs {
                inherit system;
                overlays = [ (import inputs.rust-overlay) ];
              };
              craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
                inputs.holonix.outputs.packages.${system}.rust;
            in pkgs.callPackage ./nix/sweettest.nix {
              inherit dna craneLib crateCargoToml cargoArtifacts workspacePath;
              buildInputs = buildInputs ++ holochainDeps {
                inherit pkgs;
                lib = pkgs.lib;
              };
            };
          dna = { system, dnaManifest, zomes, matchingIntegrityDna ? null }:
            let
              pkgs = import inputs.nixpkgs {
                inherit system;
                overlays = [ (import inputs.rust-overlay) ];
              };
              compare-dnas-integrity =
                (outputs inputs).packages.${system}.compare-dnas-integrity;
              dna-hash = (outputs inputs).packages.${system}.dna-hash;
              holochain = inputs.holonix.outputs.packages.${system}.holochain;

            in pkgs.callPackage ./nix/dna.nix {
              inherit zomes holochain dnaManifest compare-dnas-integrity
                dna-hash matchingIntegrityDna;
            };
          happ = { system, happManifest, dnas }:
            let
              pkgs = import inputs.nixpkgs {
                inherit system;
                overlays = [ (import inputs.rust-overlay) ];
              };
              holochain = inputs.holonix.outputs.packages.${system}.holochain;
            in pkgs.callPackage ./nix/happ.nix {
              inherit dnas holochain happManifest;
            };
        };
      };

      imports = [
        ./crates/scaffold_remote_zome/default.nix
        ./crates/compare_dnas_integrity/default.nix
        ./crates/zome_wasm_hash/default.nix
        ./crates/dna_hash/default.nix
        ./crates/sync_npm_git_dependencies_with_nix/default.nix
      ];

      systems = builtins.attrNames inputs.holonix.devShells;

      perSystem = { inputs', self', config, pkgs, system, lib, ... }: rec {
        devShells.default = pkgs.mkShell {
          inputsFrom = [ inputs'.holonix.devShells.default ];
          packages = with pkgs;
            [
              nodejs_20
              # more packages go here
            ] ++ flake.lib.holochainDeps { inherit pkgs lib; };
        };

        devShells.holochainDev = pkgs.mkShell {
          buildInputs = flake.lib.holochainDeps { inherit pkgs lib; };
        };

        packages.synchronized-pnpm = pkgs.symlinkJoin {
          name = "synchronized-pnpm";
          paths = [ inputs'.pnpmnixpkgs.legacyPackages.pnpm ];
          buildInputs = [ pkgs.makeWrapper ];
          postBuild = ''
            wrapProgram $out/bin/pnpm  --run ${self'.packages.sync-npm-git-dependencies-with-nix}/bin/sync-npm-git-dependencies-with-nix
          '';
        };

        devShells.synchronized-pnpm = pkgs.mkShell {
          packages = let
            npm-warning = pkgs.writeShellScriptBin "echo-npm-warning" ''
              							echo "
              -----------------

              WARNING: this repository is not managed with npm, but pnpm.

              Don't worry! They are really similar to each other. Here are some helpful reminders:
                            
              If you are trying to run \`npm install\`, you can run \`pnpm install\`
              If you are trying to run \`npm install some_dependency\`, you can run \`pnpm add some_dependency\`
              If you are trying to run a script like \`npm run build\`, you can run \`pnpm build\`
              If you are trying to run a script for a certain workspace like \`npm run build -w ui\`, you can run \`pnpm -F ui build\`

              The npm command that you just ran will continue now, but it is recommended that you do all commands in this repository with pnpm.

              -----------------

              "
            '';
            npm-with-warning = pkgs.symlinkJoin {
              name = "npm";
              paths = [ pkgs.nodejs_20 ];
              buildInputs = [ pkgs.makeWrapper ];
              postBuild =
                "    wrapProgram $out/bin/npm \\\n		  --run ${npm-warning}/bin/echo-npm-warning\n  ";
            };
          in [
            npm-with-warning
            pkgs.nodejs_20
            packages.synchronized-pnpm
            self'.packages.sync-npm-git-dependencies-with-nix
          ];

          shellHook = ''
            sync-npm-git-dependencies-with-nix
          '';
        };
      };
    };
}

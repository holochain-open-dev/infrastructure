{
  inputs = {
    nixpkgs.follows = "holonix/nixpkgs";
    pnpmnixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";

    holonix.url = "github:holochain/holonix/main-0.3";
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
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      flake = {
        flakeModules.builders = ./nix/builders-option.nix;
        flakeModules.dependencies = ./nix/dependencies-option.nix;
      };

      imports = [
        ./crates/scaffold_remote_zome/default.nix
        ./crates/compare_dnas_integrity/default.nix
        ./crates/zome_wasm_hash/default.nix
        ./crates/sync_npm_git_dependencies_with_nix/default.nix
        ./nix/builders-option.nix
        ./nix/dependencies-option.nix
        # inputs.holonix.inputs.flake-parts.flakeModules.flakeModules
      ];

      systems = builtins.attrNames inputs.holonix.devShells;

      perSystem = { inputs', self', config, pkgs, system, lib, ... }: rec {
        dependencies.holochain.buildInputs = (with pkgs; [ perl openssl ])
          ++ (lib.optionals pkgs.stdenv.isLinux [ pkgs.pkg-config pkgs.go ])
          ++ (pkgs.lib.optionals pkgs.stdenv.isDarwin [
            pkgs.libiconv

            pkgs.darwin.apple_sdk.frameworks.AppKit
            pkgs.darwin.apple_sdk.frameworks.WebKit
            (if pkgs.system == "x86_64-darwin" then
              (pkgs.stdenv.mkDerivation {
                name = "go";
                nativeBuildInputs = with pkgs; [ makeBinaryWrapper go ];
                dontBuild = true;
                dontUnpack = true;
                installPhase = ''
                  makeWrapper ${pkgs.go}/bin/go $out/bin/go
                '';
              })
            else
              pkgs.go)
          ]);
        builders = {
          rustZome = { crateCargoToml, workspacePath, cargoArtifacts ? null
            , matchingZomeHash ? null, meta ? { } }:
            let
              deterministicCraneLib = let
                rustToolchain =
                  inputs.holonix.outputs.packages."x86_64-linux".rust;
              in (inputs.crane.mkLib inputs.nixpkgs.outputs.legacyPackages.${
                  "x86_64-linux"
                }).overrideToolchain rustToolchain;

              craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
                inputs'.holonix.packages.rust;
              zome-wasm-hash = self'.packages.zome-wasm-hash;

            in pkgs.callPackage ./nix/zome.nix {
              inherit deterministicCraneLib craneLib crateCargoToml
                cargoArtifacts workspacePath matchingZomeHash zome-wasm-hash
                meta;
            };
          sweettest = { dna, workspacePath, crateCargoToml, buildInputs ? [ ]
            , nativeBuildInputs ? [ ], cargoArtifacts ? null }:
            let
              craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
                inputs'.holonix.packages.rust;
            in pkgs.callPackage ./nix/sweettest.nix {
              inherit dna craneLib crateCargoToml cargoArtifacts workspacePath;
              buildInputs = buildInputs
                ++ self'.dependencies.holochain.buildInputs;
            };
          dna = { dnaManifest, zomes, matchingIntegrityDna ? null, meta ? { } }:
            let
              compare-dnas-integrity = self'.packages.compare-dnas-integrity;
              holochain = inputs'.holonix.packages.holochain;

            in pkgs.callPackage ./nix/dna.nix {
              inherit zomes holochain dnaManifest compare-dnas-integrity
                matchingIntegrityDna meta;
            };
          happ = { happManifest, dnas, meta ? { } }:
            pkgs.callPackage ./nix/happ.nix {
              inherit dnas happManifest meta;
              holochain = inputs'.holonix.packages.holochain;
            };
        };

        devShells.default = pkgs.mkShell {
          inputsFrom = [ inputs'.holonix.devShells.default ];
          packages = with pkgs;
            [
              nodejs_20
              # more packages go here
            ] ++ self'.dependencies.holochain.buildInputs;
        };

        devShells.holochainDev = pkgs.mkShell {
          buildInputs = self'.dependencies.holochain.buildInputs;
        };

        packages = {
          zomeCargoArtifacts = let
            craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
              inputs'.holonix.packages.rust;
            src =
              craneLib.cleanCargoSource (craneLib.path ./nix/reference-happ);
            commonArgs = {
              inherit src;
              doCheck = false;
              CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
            };
            cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
              pname = "zome";
              version = "for-holochain-0.3.2";
            });

          in cargoArtifacts;

          holochainCargoArtifacts = let
            craneLib = (inputs.crane.mkLib pkgs).overrideToolchain
              inputs'.holonix.packages.rust;
            cargoArtifacts = craneLib.buildDepsOnly {
              buildInputs = self'.dependencies.holochain.buildInputs;
              src =
                craneLib.cleanCargoSource (craneLib.path ./nix/reference-happ);
              doCheck = false;
              # RUSTFLAGS =
              #   "--remap-path-prefix ${cargoVendorDir}=/build/source/";
              # CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS =
              #   " -Clink-arg=-fuse-ld=mold";
              # CARGO_PROFILE = "release";
              CARGO_PROFILE = "release";
              pname = "sweettest";
              version = "for-holochain-0.3.2";
            };
          in cargoArtifacts;
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

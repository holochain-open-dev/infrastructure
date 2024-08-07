{
  inputs = {
    crane.url = "github:ipetkov/crane/109987da061a1bf452f435f1653c47511587d919";

    versions.url = "github:holochain/holochain?dir=versions/0_3";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
    rust-overlay.follows = "holochain/rust-overlay";
    nixpkgs.follows = "holochain/nixpkgs";
  };

  nixConfig = {
    extra-substituters = [ "https://holochain-open-dev.cachix.org" ];
    extra-trusted-public-keys = [
      "holochain-open-dev.cachix.org-1:3Tr+9in6uo44Ga7qiuRIfOTFXog+2+YbyhwI/Z6Cp4U="
    ];
  };

  outputs = inputs@{ ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake { inherit inputs; } rec {
      flake = {
        lib = rec {
          holochainAppDeps = {
            buildInputs = { pkgs, lib }:
              (with pkgs; [
                openssl
                inputs.holochain.outputs.packages.${pkgs.system}.opensslStatic
                sqlcipher
                glib
              ]) ++ (lib.optionals pkgs.stdenv.isDarwin
                (with pkgs.darwin.apple_sdk_11_0.frameworks; [
                  AppKit
                  CoreFoundation
                  CoreServices
                  Security
                  IOKit
                ]));
            nativeBuildInputs = { pkgs, lib }:
              (with pkgs; [
                makeWrapper
                perl
                pkg-config
                inputs.holochain.outputs.packages.${pkgs.system}.goWrapper
              ]) ++ lib.optionals pkgs.stdenv.isDarwin
              (with pkgs; [ xcbuild libiconv ]);
          };

          filterByHolochainPackageType = holochainPackageType: packages:
            inputs.nixpkgs.lib.filterAttrs (key: value:
              (builtins.hasAttr "meta" value)
              && (builtins.hasAttr "holochainPackageType" value.meta)
              && value.meta.holochainPackageType == holochainPackageType)
            packages;

          filterZomes = filterByHolochainPackageType "zome";
          filterDnas = filterByHolochainPackageType "dna";
          filterHapps = filterByHolochainPackageType "happ";
          filterNpmPackages = filterByHolochainPackageType "npm";

          holochainPkgs = { system }:
            let
              pkgs = import inputs.nixpkgs {
                inherit system;
                overlays = [ (import inputs.rust-overlay) ];
              };
            in pkgs;

          holochainRustToolchain = { system }:
            let
              pkgs = holochainPkgs { inherit system; };

              rustToolchain = pkgs.rust-bin.stable."1.77.2".minimal.override {
                # Set the build targets supported by the toolchain,
                # wasm32-unknown-unknown is required for trunk.
                targets = [ "wasm32-unknown-unknown" ];
              };
            in rustToolchain;

          holochainCraneLib = { system }:
            let
              pkgs = holochainPkgs { inherit system; };
              rustToolchain = holochainRustToolchain { inherit system; };
              craneLib =
                (inputs.crane.mkLib pkgs).overrideToolchain rustToolchain;
            in craneLib;

          zomeCargoArtifacts = { system
            , craneLib ? (holochainCraneLib { inherit system; }), debug ? false
            }:
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
                version = "for-holochain-0.3.2";
              });

            in cargoArtifacts;

          holochainCargoArtifacts = { system }:
            let
              pkgs = holochainPkgs { inherit system; };
              craneLib = holochainCraneLib { inherit system; };

              buildInputs = holochainAppDeps.buildInputs {
                inherit pkgs;
                lib = pkgs.lib;
              };
              nativeBuildInputs = holochainAppDeps.nativeBuildInputs {
                inherit pkgs;
                lib = pkgs.lib;
              };
              cargoArtifacts = craneLib.buildDepsOnly {
                inherit buildInputs nativeBuildInputs;
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
                version = "for-holochain-0.3.2";
              };
            in cargoArtifacts;

          rustZome = { crateCargoToml, holochain, workspacePath
            , nonWasmCrates ? [ ], cargoArtifacts ? null }:
            let
              deterministicCraneLib = let
                pkgs = import inputs.nixpkgs {
                  system = "x86_64-linux";
                  overlays = [ (import inputs.rust-overlay) ];
                };

                rustToolchain = pkgs.rust-bin.stable."1.77.2".minimal.override {
                  # Set the build targets supported by the toolchain,
                  # wasm32-unknown-unknown is required for trunk.
                  targets = [ "wasm32-unknown-unknown" ];
                };
              in (inputs.crane.mkLib pkgs).overrideToolchain rustToolchain;

              system = holochain.devShells.holonix.system;
              pkgs = holochainPkgs { inherit system; };
              craneLib = holochainCraneLib { inherit system; };

            in pkgs.callPackage ./nix/zome.nix {
              inherit deterministicCraneLib craneLib crateCargoToml
                cargoArtifacts nonWasmCrates workspacePath;
              referenceZomeCargoArtifacts = flake.lib.zomeCargoArtifacts;
            };
          sweettest = { holochain, dna, workspacePath, crateCargoToml
            , buildInputs ? [ ], nativeBuildInputs ? [ ], cargoArtifacts ? null
            }:
            let
              system = holochain.devShells.holonix.system;
              pkgs = holochainPkgs { inherit system; };
              craneLib = holochainCraneLib { inherit system; };
            in pkgs.callPackage ./nix/sweettest.nix {
              inherit holochain dna craneLib crateCargoToml cargoArtifacts
                workspacePath;
              buildInputs = buildInputs ++ holochainAppDeps.buildInputs {
                inherit pkgs;
                lib = pkgs.lib;
              };
              nativeBuildInputs = nativeBuildInputs
                ++ holochainAppDeps.nativeBuildInputs {
                  inherit pkgs;
                  lib = pkgs.lib;
                };
            };
          dna = { holochain, dnaManifest, zomes }:
            let
              system = holochain.devShells.holonix.system;
              pkgs = holochainPkgs { inherit system; };
            in pkgs.callPackage ./nix/dna.nix {
              inherit zomes holochain dnaManifest;
            };
          happ = { holochain, happManifest, dnas }:
            let
              system = holochain.devShells.holonix.system;
              pkgs = holochainPkgs { inherit system; };
            in pkgs.callPackage ./nix/happ.nix {
              inherit dnas holochain happManifest;
            };
        };
      };

      imports = [ ./crates/scaffold_remote_zome/default.nix ];

      systems = builtins.attrNames inputs.holochain.devShells;

      perSystem = { inputs', config, pkgs, system, lib, ... }: rec {
        devShells.default = pkgs.mkShell {
          inputsFrom = [ inputs'.holochain.devShells.holonix ];
          packages = with pkgs;
            [
              nodejs_20
              # more packages go here
            ];
        };

        packages.npm-warning = pkgs.writeShellScriptBin "echo-npm-warning" ''
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

        devShells.synchronized-pnpm = pkgs.mkShell {
          packages = [
            (pkgs.symlinkJoin {
              name = "npm";
              paths = [ pkgs.nodejs_20 ];
              buildInputs = [ pkgs.makeWrapper ];
              postBuild =
                "    wrapProgram $out/bin/npm \\\n		  --run ${packages.npm-warning}/bin/echo-npm-warning\n  ";
            })
            pkgs.nodejs_20
            packages.pnpm
            packages.sync-npm-git-dependencies-with-nix
          ];

          shellHook = ''
            sync-npm-git-dependencies-with-nix
          '';
        };

        # devShells.zomeDev = let
        #   configureCargoVendoredDepsHook =
        #     pkgs.writeShellScriptBin "configureCargoVendoredDeps"
        #     (builtins.readFile ./nix/configureCargoVendoredDepsHook.sh);
        #   inheritCargoArtifacts =
        #     pkgs.writeShellScriptBin "inheritCargoArtifacts"
        #     (builtins.readFile ./nix/inheritCargoArtifacts.sh);
        #   craneLib = flake.lib.holochainCraneLib { inherit system; };
        #   zomeDeps = flake.lib.zomeCargoDeps { inherit craneLib; };
        # in pkgs.mkShell {
        #   packages = [ configureCargoVendoredDepsHook inheritCargoArtifacts ];

        #   shellHook = ''
        #     cargoVendorDir=${zomeDeps.cargoVendorDir} configureCargoVendoredDeps
        #     cargoArtifacts=${zomeDeps.cargoArtifacts} inheritCargoArtifacts
        #   '';
        # };

        # devShells.sweettestDev = let
        #   configureCargoVendoredDepsHook =
        #     pkgs.writeShellScriptBin "configureCargoVendoredDeps"
        #     (builtins.readFile ./nix/configureCargoVendoredDepsHook.sh);
        #   inheritCargoArtifacts =
        #     pkgs.writeShellScriptBin "inheritCargoArtifacts"
        #     (builtins.readFile ./nix/inheritCargoArtifacts.sh);
        #   craneLib = flake.lib.holochainCraneLib { inherit system; };
        #   holochainDeps =
        #     pkgs.callPackage flake.lib.holochainCargoDeps { inherit craneLib; };
        # in pkgs.mkShell {
        #   packages = [ configureCargoVendoredDepsHook inheritCargoArtifacts ];

        #   shellHook = ''
        #     cargoVendorDir=${holochainDeps.cargoVendorDir} configureCargoVendoredDeps
        #     cargoArtifacts=${holochainDeps.cargoArtifacts} inheritCargoArtifacts
        #   '';
        # };

        packages.sync-npm-git-dependencies-with-nix = let
          craneLib = inputs.crane.mkLib pkgs;

          cratePath = ./crates/sync_npm_git_dependencies_with_nix;

          cargoToml =
            builtins.fromTOML (builtins.readFile "${cratePath}/Cargo.toml");
          crate = cargoToml.package.name;

          commonArgs = {
            src = craneLib.cleanCargoSource (craneLib.path ./.);
            doCheck = false;
            buildInputs =
              flake.lib.holochainAppDeps.buildInputs { inherit pkgs lib; };
            nativeBuildInputs = flake.lib.holochainAppDeps.nativeBuildInputs {
              inherit pkgs lib;
            };
          };
          cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
            pname = "workspace";
            version = "workspace";
          });
        in craneLib.buildPackage (commonArgs // {
          pname = crate;
          version = cargoToml.package.version;
          inherit cargoArtifacts;
        });

        packages.pnpm = pkgs.writeShellScriptBin "pnpm" ''
          #!${pkgs.bash}/bin/bash
          exec ${pkgs.nodejs_20}/bin/node ${pkgs.nodejs_20}/bin/corepack pnpm@9.2.0 "$@"
        '';
      };
    };
}

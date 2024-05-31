{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
    hcUtils.url = "path:../../..";
    module.url = "path:../module-repo";
  };

  outputs = inputs@{ ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./dna/dna.nix ];

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem = { inputs', config, pkgs, system, lib, self', ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [ inputs'.holochain.devShells.holonix ];
          packages = with pkgs; [
            nodejs_20
            # more packages go here
            cargo-nextest
            (inputs.hcUtils.lib.syncNpmDependenciesWithNix {
              inherit system;
              holochainPackages = upstreamNpmPackages { inherit inputs'; };
            })
          ];

          shellHook = ''
            sync-npm-dependencies-with-nix
          '';
        };
        # packages.i = inputs'.profiles.packages.profiles_ui;
      };
    };
}

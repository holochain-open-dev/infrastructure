{
  description = "Template for Holochain app development";
  
  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
		hcUtils.url = "path:../..";
		profiles.url = "github:holochain-open-dev/profiles";
  };

  outputs = inputs @ { ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
        specialArgs = rec {
          rootPath = ./.;
          holochainSources = inputs': with inputs'; [ 
            profiles
            # ... and add the name of the repository here as well
          ];

          # Aggregators: take all the packages from this repository and the upstream
          # holochain sources and merge them
          allHolochainPackages = { inputs', self' }: inputs.nixpkgs.lib.attrsets.mergeAttrsList (
            [ self'.packages ] 
            ++ builtins.map (s: s.packages) (holochainSources inputs')
          );
          allZomes = { inputs', self' }: inputs.hcUtils.outputs.lib.filterZomes (allHolochainPackages { inherit inputs' self'; });
          allDnas = { inputs', self' }: inputs.hcUtils.outputs.lib.filterDnas (allHolochainPackages { inherit inputs' self'; });
          allHapps = { inputs', self' }: inputs.hcUtils.outputs.lib.filterHapps (allHolochainPackages { inherit inputs' self'; });
          allNpmPackages = { inputs', self' }: inputs.hcUtils.outputs.lib.filterNpmPackages (allHolochainPackages { inherit inputs' self'; });
        };
      }
      {
        imports = [
					./happ.nix
        ];

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
                nodejs_20
                # more packages go here
                cargo-nextest
              ] ++ [ 
                inputs'.hcUtils.packages.sync-npm-dependencies-with-nix 
              ];

              shellHook = ''
                sync-npm-dependencies-with-nix ${builtins.trace config "hey"}
              ''; 
            };

          };
      };
}

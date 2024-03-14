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
    profiles.url = "github:holochain-open-dev/profiles/nixify";
  };

  outputs = inputs @ { ... }:
    let 
      holochainSources = inputs': with inputs'; [ 
        profiles
        # ... and add the name of the repository here as well
      ];

      # Holochain packages coming from the upstream repositories
      upstreamHolochainPackages  = { inputs' }: inputs.nixpkgs.lib.attrsets.mergeAttrsList (
        builtins.map (s: s.packages) (holochainSources inputs')
      );
      # All holochain packages from this _and_ the upstream repositories, combined
      allHolochainPackages = { inputs', self' }: inputs.nixpkgs.lib.attrsets.mergeAttrsList [ 
        self'.packages 
        (upstreamHolochainPackages { inherit inputs'; }) 
      ];
      allZomes = { inputs', self' }: inputs.hcUtils.outputs.lib.filterZomes (allHolochainPackages { inherit inputs' self'; });
      allDnas = { inputs', self' }: inputs.hcUtils.outputs.lib.filterDnas (allHolochainPackages { inherit inputs' self'; });
      allHapps = { inputs', self' }: inputs.hcUtils.outputs.lib.filterHapps (allHolochainPackages { inherit inputs' self'; });
      upstreamNpmPackages = { inputs' }: inputs.hcUtils.outputs.lib.filterNpmPackages (upstreamHolochainPackages { inherit inputs'; });   
    in
      inputs.holochain.inputs.flake-parts.lib.mkFlake
        {
          inherit inputs;
          specialArgs = {
            rootPath = ./.;
            inherit holochainSources allHolochainPackages allZomes allDnas allHapps;
          };
        }
        {
          imports = [
            ./zome/zome.nix
          ];

          systems = builtins.attrNames inputs.holochain.devShells;
          perSystem =
            { inputs'
            , config
            , pkgs
            , system
            , lib
            , self'
            , ...
            }: {
              devShells.default = pkgs.mkShell {
                inputsFrom = [ inputs'.holochain.devShells.holonix ];
                packages = [
                  pkgs.nodejs_20
                  # more packages go here
                  pkgs.cargo-nextest
                  inputs'.hcUtils.packages.pnpm
                  inputs'.hcUtils.packages.sync-npm-git-dependencies-with-nix
                ];

                shellHook = ''
                  sync-npm-git-dependencies-with-nix
                '';
              };
              # packages.i = inputs'.profiles.packages.profiles_ui;
            };
        };
}

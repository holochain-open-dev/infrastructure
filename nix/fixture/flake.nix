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
    let 
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
    in
      inputs.holochain.inputs.flake-parts.lib.mkFlake
        {
          inherit inputs;
          specialArgs = {
            rootPath = ./.;
            inherit holochainSources allHolochainPackages allZomes allDnas allHapps allNpmPackages;
          };
        }
        {
          imports = [
  					./happ.nix
            ./zome/ui.nix
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
                packages = with pkgs; [
                  nodejs_20
                  # more packages go here
                  cargo-nextest
                ] ++ [ 
                  inputs'.hcUtils.packages.replace-npm-dependencies-sources 
                ];

                shellHook = ''
                  replace-npm-dependencies-sources ${builtins.toString (builtins.map (p: "${p.meta.packageName}=${p.outPath}/lib") (builtins.attrValues (allNpmPackages {inherit inputs' self';})))}
                ''; 
              };
              # packages.i = inputs'.profiles.packages.profiles_ui;
            };
        };
}

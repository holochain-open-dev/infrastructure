{ inputs, ... }:

{
  imports = [./zome/zome.nix];

  perSystem =
    { inputs'
    , config
    , pkgs
    , system
    , lib
    , self'
    , options
    , ...
    }: {
  	  packages = 
        let 
          allZomes = inputs.hcUtils.lib.filterZomes self'.packages;
          zomes = {
          } // allZomes;
        in 
          {
            my_dna = inputs.hcUtils.outputs.lib.dna {
              dnaManifest = ./dna.yaml;
              inherit zomes;
              holochain = inputs'.holochain;
            };
          };
  	};
}


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
          dnaManifest = ./dna.yaml;
          allZomes = inputs.hcUtils.lib.filterZomes self'.packages;
          zomes = {
          } // allZomes;
        in 
          {
            my_dna = inputs.hcUtils.outputs.lib.dna {
              inherit dnaManifest zomes;
              holochain = inputs'.holochain;
            };
          };
  	};
}


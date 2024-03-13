{ inputs, allZomes, ... }:

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
          zomes = (allZomes { inherit self' inputs'; }) // {
          };
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


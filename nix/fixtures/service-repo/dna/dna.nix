{ inputs, ... }:

{
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
  	  packages.my_dna = inputs.hcUtils.outputs.lib.dna {
        dnaManifest = ./dna.yaml;
        holochain = inputs'.holochain;
        zomes = {
          my_zome = inputs'.module.packages.my_zome;
        };
      };
  	};
}

{ inputs, ... }:

{
  imports = [./dna.nix];

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
          happManifest = ./happ.yaml;
          allDnas = inputs.hcUtils.lib.filterDnas self'.packages;
				  dnas = {
          } // allDnas;
			in
	      {
	        my_happ = inputs.hcUtils.outputs.lib.happ {
	          holochain = inputs'.holochain;
	          inherit dnas happManifest;
	        };
	  	  };
  	};
}


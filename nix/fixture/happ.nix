{ inputs, allDnas, ... }:

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
				  dnas = (allDnas { inherit self' inputs'; }) // {
          };
			in
	      {
	        my_happ = inputs.hcUtils.outputs.lib.happ {
	          holochain = inputs'.holochain;
	          inherit dnas happManifest;
	        };
	  	  };
  	};
}


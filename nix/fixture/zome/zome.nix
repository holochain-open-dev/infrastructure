{ inputs, rootPath, ... }:

{
  perSystem =
    { inputs'
    , self'
    , ...
    }: {
      packages.my_zome = inputs.hcUtils.outputs.lib.rustZome {
        workspacePath = rootPath;
        holochain = inputs'.holochain;
				cargoTomlPath = ./Cargo.toml;
      };
      checks.my_zome = inputs.hcUtils.outputs.lib.sweettest {
        workspacePath = rootPath;
        holochain = inputs'.holochain;
        dna = self'.packages.my_dna;
				cargoTomlPath = ./Cargo.toml;
      };
  	};
}



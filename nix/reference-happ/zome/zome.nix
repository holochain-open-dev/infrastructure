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
				crateCargoToml = ./Cargo.toml;
      };
      checks.my_zome = inputs.hcUtils.outputs.lib.sweettest {
        workspacePath = rootPath;
        holochain = inputs'.holochain;
        dna = inputs.hcUtils.outputs.lib.dna {
          dnaManifest = builtins.toFile "dna.yaml" ''
            ---
            manifest_version: "1"
            name: my_dna
            integrity:
              network_seed: ~
              properties: ~
              origin_time: 1709638576394039
              zomes: []
            coordinator:
              zomes:
                - name: my_zome
                  hash: ~
                  dependencies: []
                  dylib: ~
          '';
          zomes = {
            my_zome = self'.packages.my_zome;
          };
          holochain = inputs'.holochain;
        };
        crateCargoToml = ./Cargo.toml;
      };
  	};
}



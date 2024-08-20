{ inputs, ... }:

{
  perSystem = { inputs', self', system, ... }: {
    packages.my_zome_integrity = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.lib.zomeCargoArtifacts { inherit system; };
      # matchingZomeHash = inputs'.previousZomeVersion.packages.my_zome;
    };
  };
}


{ inputs, ... }:

{
  perSystem = { inputs', self', system, ... }: {
    packages.my_zome_integrity = inputs.hc-infra.outputs.lib.rustZome {
      inherit system;
      workspacePath = inputs.self.outPath;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.lib.zomeCargoArtifacts { inherit system; };
      # matchingZomeHash = inputs'.previousZomeVersion.packages.my_zome;
    };
  };
}


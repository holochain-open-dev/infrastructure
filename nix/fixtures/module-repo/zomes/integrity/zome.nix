{ inputs, ... }:

{
  perSystem = { inputs', self', system, ... }: {
    packages.my_zome_integrity =
      inputs.hc-infra.outputs.builders.${system}.rustZome {
        workspacePath = inputs.self.outPath;
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts = inputs'.hc-infra.packages.zomeCargoArtifacts;
        # matchingZomeHash = inputs'.previousZomeVersion.packages.my_zome;
      };
  };
}

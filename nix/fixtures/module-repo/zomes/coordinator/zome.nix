{ inputs, ... }:

{
  perSystem = { inputs', self', system, ... }: {
    packages.my_zome = inputs.hc-infra.outputs.builders.${system}.rustZome {
      workspacePath = inputs.self.outPath;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts = inputs'.hc-infra.packages.zomeCargoArtifacts;
      # matchingZomeHash = inputs'.previousZomeVersion.packages.my_zome;
    };

    checks.my_zome = inputs.hc-infra.outputs.builders.${system}.sweettest {
      workspacePath = inputs.self.outPath;
      dna = inputs.hc-infra.outputs.builders.${system}.dna {
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
        zomes = { my_zome = self'.packages.my_zome; };
      }.meta.debug;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts = inputs'.hc-infra.packages.holochainCargoArtifacts;
    };
  };
}


{ inputs, ... }:

{
  perSystem = { inputs', self', system, ... }: {
    packages.my_zome = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.lib.zomeCargoArtifacts { inherit system; };
      # matchingZomeHash = inputs'.previousZomeVersion.packages.my_zome;
    };

    checks.my_zome = inputs.hc-infra.outputs.lib.sweettest {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      dna = inputs.hc-infra.outputs.lib.dna {
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
        holochain = inputs'.holochain;
      };
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.lib.holochainCargoArtifacts { inherit system; };
    };
  };
}


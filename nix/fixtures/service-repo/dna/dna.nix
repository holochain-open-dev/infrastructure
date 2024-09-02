{ inputs, ... }:

{
  perSystem = { inputs', config, pkgs, system, lib, self', options, ... }: {
    packages.my_dna = inputs.hc-infra.outputs.lib.dna {
      dnaManifest = ./dna.yaml;
      inherit system;
      zomes = {
        my_zome = inputs'.module.packages.my_zome;
        my_zome_integrity = inputs'.module.packages.my_zome_integrity;
      };
      # matchingIntegrityDna = inputs'.previousDnaVersion.packages.my_dna;
    };
  };
}

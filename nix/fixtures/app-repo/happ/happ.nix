{ inputs, ... }:

{
  perSystem = { inputs', config, pkgs, system, lib, self', options, ... }: {
    packages = {
      my_happ = inputs.hc-infra.outputs.lib.happ {
        happManifest = ./happ.yaml;
        holochain = inputs'.holochain;
        dnas = { my_dna = inputs'.service.packages.my_dna; };
      };
    };
  };
}


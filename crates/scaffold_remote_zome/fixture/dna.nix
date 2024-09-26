{ inputs, ... }:

{
  perSystem = { inputs', self', lib, system, ... }: {
    packages.forum = inputs.hc-infra.outputs.builders.${system}.dna {
      dnaManifest = ./dna.yaml;
      zomes = { };
    };
  };
}


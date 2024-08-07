{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/0_3";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
  };

  outputs = inputs@{ ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./dna.nix ];

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem = { inputs', config, pkgs, system, lib, self', ... }: { };
    };
}

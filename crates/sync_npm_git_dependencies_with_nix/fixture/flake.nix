{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
    hcUtils.url = "path:../../..";
    profiles.url = "github:holochain-open-dev/profiles/nixify";
    file-storage.url =
      "github:holochain-open-dev/file-storage/for-hdk-0.3.0-beta-dev";
  };

  outputs = inputs@{ ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake { inherit inputs; } {

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem = { inputs', config, pkgs, system, lib, self', ... }: { };
    };
}

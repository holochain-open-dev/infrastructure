{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/0_3";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
    hc-infra.url = "path:../../..";
    profiles.url = "github:holochain-open-dev/profiles/nixify";
  };

  outputs = inputs@{ ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./zome/zome.nix ];

      systems = builtins.attrNames inputs.holochain.devShells;
      perSystem = { inputs', config, pkgs, system, lib, self', ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            # inputs'.hc-infra.devShells.zomeDev
            # inputs'.hc-infra.devShells.sweettestDev
            inputs'.holochain.devShells.holonix
          ];
          packages = [ pkgs.nodejs_20 ];
        };
      };
    };
}

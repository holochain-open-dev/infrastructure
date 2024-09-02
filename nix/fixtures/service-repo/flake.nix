{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holonix/nixpkgs";
    holonix.url = "github:holochain/holonix/main-0.3";

    hc-infra.url = "path:./../../..";
    module.url = "path:./../module-repo";
    profiles.url = "github:holochain-open-dev/profiles/nixify";

    # previousDnaVersion.url =
    #   "github:holochain-open-dev/infrastructure/cab12a7cfe0c7da510f4887b7bc93321cd0b6960?dir=nix/fixtures/service-repo";
  };

  outputs = inputs@{ ... }:
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./dna/dna.nix ];

      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', config, pkgs, system, lib, self', ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.holonix.devShells.default
          ];
          packages = [ pkgs.nodejs_20 ];
        };
      };
    };
}

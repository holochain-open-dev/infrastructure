{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holonix/nixpkgs";
    holonix.url = "github:holochain/holonix/main-0.3";

    hc-infra.url = "path:./../../..";
    profiles.url = "github:holochain-open-dev/profiles/nixify";
    # previousZomeVersion.url = "github:holochain-open-dev/infrastructure/67dffe4af2c8675cd47d0b404fd0473d6a93ddfd?dir=nix/fixtures/module-repo";
  };

  outputs = inputs@{ ... }:
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        ./zomes/coordinator/zome.nix
        ./zomes/integrity/zome.nix
        inputs.hc-infra.flakeModules.builders
      ];

      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', config, pkgs, system, lib, self', ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.hc-infra.devShells.holochainDev
            # inputs'.hc-infra.devShells.zomeDev
            # inputs'.hc-infra.devShells.sweettestDev
            inputs'.holonix.devShells.default
          ];
          packages = [ pkgs.nodejs_20 ];

        };
      };
    };
}

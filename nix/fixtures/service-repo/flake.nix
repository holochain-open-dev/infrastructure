{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/0_3";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };

    hc-infra.url = "path:./../../..";
    module.url = "path:./../module-repo";
    profiles.url = "github:holochain-open-dev/profiles/nixify";

    # previousDnaVersion.url = "github:holochain-open-dev/infrastructure/b4e2134c89d13639347e8d426a6add0ca6b36d7e?dir=nix/fixtures/service-repo";
  };

  outputs = inputs@{ ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./dna/dna.nix ];

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

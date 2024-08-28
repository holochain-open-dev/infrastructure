{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/weekly";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };

    hc-infra.url = "path:./../../..";
    module = {
      url = "path:./../module-repo";
      inputs.hc-infra.follows = "hc-infra";
    };
    profiles.url = "github:holochain-open-dev/profiles/nixify";

    # previousDnaVersion.url =
    # "github:holochain-open-dev/infrastructure/cab12a7cfe0c7da510f4887b7bc93321cd0b6960?dir=nix/fixtures/service-repo";
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

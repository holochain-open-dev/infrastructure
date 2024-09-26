{ lib, flake-parts-lib, ... }:
let
  inherit (lib) mkOption types;
  inherit (flake-parts-lib) mkTransposedPerSystemModule;
in mkTransposedPerSystemModule {
  name = "dependencies";
  option = mkOption {
    description =
      "Attribute that contains the buildInputs and nativeBuildInputs packages that a certain class of derivation needs to be built";
    type = types.attrsOf (types.submodule {
      options = {
        buildInputs = mkOption {
          type = types.listOf types.package;
          description =
            "The buildInputs that a certain class of derivation needs to be build";
          default = null;
        };
        nativeBuildInputs = mkOption {
          type = types.listOf types.package;
          description =
            "The nativeBuildInputs that a certain class of derivation needs to be build";
          default = null;
        };
      };
    });

    default = null;
  };
  file = ./dependencies-option.nix;
}

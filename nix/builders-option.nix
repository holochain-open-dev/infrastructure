{ lib, flake-parts-lib, ... }:
let
  inherit (lib) mkOption types;
  inherit (flake-parts-lib) mkTransposedPerSystemModule;
in mkTransposedPerSystemModule {
  name = "builders";
  option = mkOption {
    description =
      "Nix function that receives arguments and returns a derivation";
    type = types.attrsOf (types.functionTo types.package);

    default = null;
  };
  file = ./builders-option.nix;
}

{ inputs, self, ... }:

{
  perSystem = { inputs', pkgs, self', lib, ... }: {

    packages.scaffold-remote-zome = let
      craneLib = inputs.crane.mkLib pkgs;

      cratePath = ./.;

      cargoToml =
        builtins.fromTOML (builtins.readFile "${cratePath}/Cargo.toml");
      crate = cargoToml.package.name;

      commonArgs = {
        src = craneLib.cleanCargoSource (craneLib.path ../../.);
        doCheck = false;
        buildInputs = self.lib.holochainDeps { inherit pkgs lib; };
      };
      cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
        pname = "t-nesh-workspace";
        version = "0.3.x";
      });
    in craneLib.buildPackage (commonArgs // {
      pname = crate;
      version = cargoToml.package.version;
      inherit cargoArtifacts;
    });
  };
}

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
        buildInputs =
          self.lib.holochainAppDeps.buildInputs { inherit pkgs lib; };
        nativeBuildInputs =
          self.lib.holochainAppDeps.nativeBuildInputs { inherit pkgs lib; };
      };
      cargoArtifacts = craneLib.buildDepsOnly (commonArgs // {
        pname = "workspace";
        version = "workspace";
      });
    in craneLib.buildPackage (commonArgs // {
      pname = crate;
      version = cargoToml.package.version;
      inherit cargoArtifacts;
    });
  };
}

{
	holochain,
	dna,
	workspacePath,
	pkgs,
	lib,
	craneLib,
	cargoTomlPath,
	...
}: 
let 
	cargoToml = builtins.fromTOML (builtins.readFile cargoTomlPath);
  crate = cargoToml.package.name;
	
  buildInputs = (with pkgs; [ openssl holochain.packages.opensslStatic sqlcipher ])
    ++ (lib.optionals pkgs.stdenv.isDarwin
    (with pkgs.darwin.apple_sdk_11_0.frameworks; [
      AppKit
      CoreFoundation
      CoreServices
      Security
      IOKit
    ]));
  commonArgs = {
    inherit buildInputs;
    src = craneLib.cleanCargoSource (craneLib.path workspacePath);
    version = "workspace";
    pname = "test";
    strictDeps = true;

    nativeBuildInputs = (with pkgs; [ makeWrapper perl pkg-config holochain.packages.goWrapper ])
      ++ lib.optionals pkgs.stdenv.isDarwin
      (with pkgs; [ xcbuild libiconv ]);

  };
  cargoArtifacts = craneLib.buildDepsOnly commonArgs;
in craneLib.cargoNextest (commonArgs // {
  inherit cargoArtifacts;
	cargoExtraArgs = "-p ${crate} --locked";

  DNA_PATH = dna;
})

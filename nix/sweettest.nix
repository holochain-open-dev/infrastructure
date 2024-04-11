{
	holochain,
	dna,
	workspacePath,
	pkgs,
	lib,
	craneLib,
	crateCargoToml,
	...
}: 
let 
	cargoToml = builtins.fromTOML (builtins.readFile crateCargoToml);
  crate = cargoToml.package.name;
	
  buildInputs = (with pkgs; [ openssl holochain.packages.opensslStatic sqlcipher glib ])
    ++ (lib.optionals pkgs.stdenv.isLinux
    (with pkgs; [
      webkitgtk_4_1.dev
      gdk-pixbuf
      gtk3
      # Video/Audio data composition framework tools like "gst-inspect", "gst-launch" ...
      gst_all_1.gstreamer
      # Common plugins like "filesrc" to combine within e.g. gst-launch
      gst_all_1.gst-plugins-base
      # Specialized plugins separated by quality
      gst_all_1.gst-plugins-good
      gst_all_1.gst-plugins-bad
      gst_all_1.gst-plugins-ugly
      # Plugins to reuse ffmpeg to play almost every video format
      gst_all_1.gst-libav
      # Support the Video Audio (Hardware) Acceleration API
      gst_all_1.gst-vaapi
      libsoup_3
    ]))
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
  cargoNextestExtraArgs = "-p ${crate} --locked -j 1";


  DNA_PATH = dna;
})

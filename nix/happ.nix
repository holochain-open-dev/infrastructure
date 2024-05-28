# Build a hApp
{ happManifest, holochain, writeText, json2yaml, callPackage, runCommandNoCC
, runCommandLocal, dnas ? { } }:

let
  dnaSrcs = builtins.attrValues dnas;

  # Recurse over the DNA roles, and add the correct bundled DNA package by name

  manifest = (callPackage ./import-yaml.nix { }) happManifest;
  dnaToBundled = role:
    role // {
      dna = role.dna // { bundled = dnas.${role.name}.meta.release; };
    };
  roles = builtins.map dnaToBundled manifest.roles;

  manifest' = manifest // { roles = roles; };

  happManifestJson = writeText "happ.json" (builtins.toJSON manifest');
  happManifestYaml = runCommandLocal "json-to-yaml" { }
    "	${json2yaml}/bin/json2yaml ${happManifestJson} $out\n";
  release = runCommandLocal manifest.name {
    srcs = builtins.map (dna: dna.meta.release) dnaSrcs;
    meta = {
      inherit debug;
      holochainPackageType = "happ";
    };
  } ''
      mkdir workdir
    	cp ${happManifestYaml} workdir/happ.yaml
    	${holochain.packages.holochain}/bin/hc app pack workdir
    	mv workdir/${manifest.name}.happ $out
  '';
  debug = let
    # Recurse over the DNA roles, and add the correct bundled DNA package by name

    manifest = (callPackage ./import-yaml.nix { }) happManifest;
    dnaToBundled = role:
      role // {
        dna = role.dna // { bundled = dnas.${role.name}; };
      };
    roles = builtins.map dnaToBundled manifest.roles;

    manifest' = manifest // { roles = roles; };

    happManifestJson = writeText "happ.json" (builtins.toJSON manifest');
    happManifestYaml = runCommandLocal "json-to-yaml" { }
      "	${json2yaml}/bin/json2yaml ${happManifestJson} $out\n";
  in runCommandLocal manifest.name {
    srcs = dnaSrcs;
    meta = {
      inherit release;
      holochainPackageType = "happ";
    };
  }
  "	mkdir workdir\n	cp ${happManifestYaml} workdir/happ.yaml\n	${holochain.packages.holochain}/bin/hc app pack workdir\n	mv workdir/${manifest.name}.happ $out\n";
in debug

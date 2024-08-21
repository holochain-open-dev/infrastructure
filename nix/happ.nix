# Build a hApp
{ happManifest, holochain, writeText, json2yaml, callPackage, runCommandNoCC
, runCommandLocal, dnas ? { } }:

let
  dnaSrcs = builtins.attrValues dnas;

  # Recurse over the DNA roles, and add the correct bundled DNA package by name

  manifest = (callPackage ./import-yaml.nix { }) happManifest;
  dnaToBundled = role:
    role // {
      dna = role.dna // { bundled = "./${role.name}.dna"; };
    };

  manifest' = manifest // { roles = builtins.map dnaToBundled manifest.roles; };

  happManifestJson = writeText "happ.json" (builtins.toJSON manifest');
  happManifestYaml = runCommandLocal "json-to-yaml" { }
    "	${json2yaml}/bin/json2yaml ${happManifestJson} $out\n";

  release = runCommandLocal manifest.name {
    srcs = builtins.map (dna: dna.meta.release) dnaSrcs;
    meta = { holochainPackageType = "happ"; };
  } ''
      mkdir workdir

    	cp ${happManifestYaml} workdir/happ.yaml

      ${
        builtins.toString (builtins.map (role: ''
          cp ${dnas.${role.name}.meta.release} ./workdir/${role.name}.dna 
        '') manifest'.roles)
      }

    	${holochain.packages.holochain}/bin/hc app pack workdir
    	mv workdir/${manifest.name}.happ $out
  '';

  debug = runCommandLocal manifest.name {
    srcs = dnaSrcs;
    meta = {
      inherit release;
      holochainPackageType = "happ";
    };
  } ''
      mkdir workdir
        
      cp ${happManifestYaml} workdir/happ.yaml

      ${
        builtins.toString (builtins.map (role: ''
          cp ${dnas.${role.name}} ./workdir/${role.name}.dna 
        '') manifest.roles)
      }

    	${holochain.packages.holochain}/bin/hc app pack workdir
    	mv workdir/${manifest.name}.happ $out
  '';
in debug

# Build a DNA
{ dnaManifest, json2yaml, runCommandLocal, callPackage, writeText, holochain
, zomes ? { } }:

let
  zomeSrcs = builtins.attrValues zomes;

  # Recurse over the zomes, and add the correct bundled zome package by name
  manifest = (callPackage ./import-yaml.nix { }) dnaManifest;
  zomeToBundled = zome: zome // { bundled = zomes.${zome.name}.meta.release; };
  coordinatorZomes = builtins.map zomeToBundled manifest.coordinator.zomes;
  integrityZomes = builtins.map zomeToBundled manifest.integrity.zomes;

  manifest' = manifest // {
    coordinator.zomes = coordinatorZomes;
    integrity = manifest.integrity // { zomes = integrityZomes; };
  };

  dnaManifestJson = writeText "dna.json" (builtins.toJSON manifest');
  dnaManifestYaml = runCommandLocal "json-to-yaml" { }
    "	${json2yaml}/bin/json2yaml ${dnaManifestJson} $out\n"; # Recurse over the zomes, and add the correct bundled zome package by name
  release = runCommandLocal manifest.name {
    srcs = builtins.map (zome: zome.meta.release) zomeSrcs;
    meta = { holochainPackageType = "dna"; };
  } ''
      mkdir workdir
    	cp ${dnaManifestYaml} workdir/dna.yaml
    	${holochain.packages.holochain}/bin/hc dna pack workdir
    	mv workdir/${manifest.name}.dna $out
  '';

  # Debug package
  debug = let
    manifest = (callPackage ./import-yaml.nix { }) dnaManifest;
    zomeToBundled = zome: zome // { bundled = zomes.${zome.name}; };
    coordinatorZomes = builtins.map zomeToBundled manifest.coordinator.zomes;
    integrityZomes = builtins.map zomeToBundled manifest.integrity.zomes;

    manifest' = manifest // {
      coordinator.zomes = coordinatorZomes;
      integrity = manifest.integrity // { zomes = integrityZomes; };
    };

    dnaManifestJson = writeText "dna.json" (builtins.toJSON manifest');
    dnaManifestYaml = runCommandLocal "json-to-yaml" { }
      "	${json2yaml}/bin/json2yaml ${dnaManifestJson} $out\n";
  in runCommandLocal manifest.name {
    srcs = zomeSrcs;
    meta = {
      inherit release;
      holochainPackageType = "dna";
    };
  }
  "	mkdir workdir\n	cp ${dnaManifestYaml} workdir/dna.yaml\n	${holochain.packages.holochain}/bin/hc dna pack workdir\n	mv workdir/${manifest.name}.dna $out\n";
in debug

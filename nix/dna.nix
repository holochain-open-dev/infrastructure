# Build a DNA
{ 
  dnaManifest
  , json2yaml
  , runCommandLocal
  , callPackage
  , writeText
  , holochain
  # If given a DNA, will check whether the DNA hashes for the given `matchingIntegrityDna` and the DNA to be built match
  # If they don't, it will print an error describing which zomes don't match
  , matchingIntegrityDna ? null
  , compare-dnas-integrity
  , zomes ? { }
}:

let
  zomeSrcs = builtins.attrValues zomes;

  # Recurse over the zomes, and add the correct bundled zome package by name
  manifest = (callPackage ./import-yaml.nix { }) dnaManifest;
  zomeToBundled = zome: zome // { bundled = "./${zome.name}.wasm"; };
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

      ${
        builtins.toString (builtins.map (zome: ''
          cp ${zomes.${zome.name}.meta.release} ./workdir/${zome.name}.wasm
        '') manifest'.integrity.zomes)
      }

      ${
        builtins.toString (builtins.map (zome: ''
          cp ${zomes.${zome.name}.meta.release} ./workdir/${zome.name}.wasm
        '') manifest'.coordinator.zomes)
      }
    	
    	${holochain.packages.holochain}/bin/hc dna pack workdir
    	mv workdir/${manifest.name}.dna $out
  '';

  guardedRelease = if matchingIntegrityDna != null then runCommandLocal "check-match-dna-${manifest.name}-integrity" {
    srcs = [ release matchingIntegrityDna.meta.release ];
    buildInputs = [ compare-dnas-integrity ];
  } ''
    ${compare-dnas-integrity}/bin/compare-dnas-integrity ${matchingIntegrityDna.meta.release} ${release}
    cp ${release} $out
  '' else release;

  # Debug package
  debug = runCommandLocal manifest.name {
    srcs = zomeSrcs;
    meta = {
      release = guardedRelease;
      holochainPackageType = "dna";
    };
  } ''
    	mkdir workdir
    	cp ${dnaManifestYaml} workdir/dna.yaml
      
      ${
        builtins.toString (builtins.map (zome: ''
          cp ${zomes.${zome.name}} ./workdir/${zome.name}.wasm
        '') manifest'.integrity.zomes)
      }
      ${
        builtins.toString (builtins.map (zome: ''
          cp ${zomes.${zome.name}} ./workdir/${zome.name}.wasm
        '') manifest'.coordinator.zomes)
      }
      
    	${holochain.packages.holochain}/bin/hc dna pack workdir
    	mv workdir/${manifest.name}.dna $out
  '';
in debug

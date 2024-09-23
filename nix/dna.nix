# Build a DNA
{ dnaManifest, json2yaml, runCommandLocal, pkgs, writeText, holochain
# If given a DNA, will check whether the DNA hashes for the given `matchingIntegrityDna` and the DNA to be built match
# If they don't, it will print an error describing which zomes don't match
, matchingIntegrityDna ? null, compare-dnas-integrity, dna-hash, zomes ? { } }:

let
  zomeSrcs = builtins.attrValues zomes;

  # Recurse over the zomes, and add the correct bundled zome package by name
  manifest = (pkgs.callPackage ./import-yaml.nix { }) dnaManifest;
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

  # Debug package
  debug = runCommandLocal manifest.name {
    srcs = builtins.map (zome: zome.meta.debug) zomeSrcs;
  } ''
    	mkdir workdir
    	cp ${dnaManifestYaml} workdir/dna.yaml
      
      ${
        builtins.toString (builtins.map (zome: ''
          cp ${zomes.${zome.name}.meta.debug} ./workdir/${zome.name}.wasm
        '') manifest'.integrity.zomes)
      }

      ${
        builtins.toString (builtins.map (zome: ''
          cp ${zomes.${zome.name}.meta.debug} ./workdir/${zome.name}.wasm
        '') manifest'.coordinator.zomes)
      }
      
    	${holochain}/bin/hc dna pack workdir
    	mv workdir/${manifest.name}.dna $out
  '';

  release = runCommandLocal "${manifest.name}-release" { srcs = zomeSrcs; } ''
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
    	
    	${holochain}/bin/hc dna pack workdir
    	mv workdir/${manifest.name}.dna $out
      ${dna-hash}/bin/dna-hash $out > $hash
  '';

  guardedRelease = if matchingIntegrityDna != null then
    runCommandLocal "check-match-dna-${manifest.name}-integrity" {
      srcs = [ release matchingIntegrityDna ];
      buildInputs = [ compare-dnas-integrity ];
      outputs = [ "out" "hash" ];
    } ''
      ${compare-dnas-integrity}/bin/compare-dnas-integrity ${matchingIntegrityDna} ${release}
      cp ${release} $out
      cat ${release.hash} > $hash
    ''
  else
    release;

in runCommandLocal manifest.name {
  meta = { inherit debug; };
  outputs = [ "out" ];
} ''
  cp ${guardedRelease} $out
  ${dna-hash}/bin/dna-hash $out > $hash
''

# Build a DNA
{
	dnaManifest,
	json2yaml,
	runCommandLocal,
	callPackage,
	writeText,
	holochain,
	zomes ? {}
}:

let
	zomeSrcs = builtins.attrValues zomes;
  
    # Recurse over the zomes, and add the correct bundled zome package by name
	manifest = (callPackage ./import-yaml.nix {}) dnaManifest;
	zomeToBundled = zome: zome // {
		bundled = zomes.${zome.name};
	};
	coordinatorZomes = builtins.map zomeToBundled manifest.coordinator.zomes;
	integrityZomes = builtins.map zomeToBundled manifest.integrity.zomes;

	manifest' = manifest // {
		coordinator.zomes = coordinatorZomes;
		integrity = manifest.integrity // {
			zomes = integrityZomes;
		};
	};

	dnaManifestJson = writeText "dna.json" (builtins.toJSON manifest');
	dnaManifestYaml = runCommandLocal "json-to-yaml" {} ''
		${json2yaml}/bin/json2yaml ${dnaManifestJson} $out
	'';    # Recurse over the zomes, and add the correct bundled zome package by name

	# Debug package
	debug = let
		manifest = (callPackage ./import-yaml.nix {}) dnaManifest;
		zomeToBundled = zome: zome // {
			bundled = zomes.${zome.name}.meta.debug;
		};
		coordinatorZomes = builtins.map zomeToBundled manifest.coordinator.zomes;
		integrityZomes = builtins.map zomeToBundled manifest.integrity.zomes;

		manifest' = manifest // {
			coordinator.zomes = coordinatorZomes;
			integrity = manifest.integrity // {
				zomes = integrityZomes;
			};
		};

		dnaManifestJson = writeText "dna.json" (builtins.toJSON manifest');
		dnaManifestYaml = runCommandLocal "json-to-yaml" {} ''
			${json2yaml}/bin/json2yaml ${dnaManifestJson} $out
		'';
	in
		runCommandLocal manifest.name {
			srcs = builtins.map (zome: zome.meta.debug) zomeSrcs;
			meta = {
				holochainPackageType = "dna";
			};
		} ''
			mkdir workdir
			cp ${dnaManifestYaml} workdir/dna.yaml
			${holochain.packages.holochain}/bin/hc dna pack workdir
			mv workdir/${manifest.name}.dna $out
		'';
in
  runCommandLocal manifest.name {
		srcs = zomeSrcs;
		meta = {
			inherit debug;
			holochainPackageType = "dna";
		};
	} ''
	  mkdir workdir
		cp ${dnaManifestYaml} workdir/dna.yaml
		${holochain.packages.holochain}/bin/hc dna pack workdir
		mv workdir/${manifest.name}.dna $out
	''

# Build a DNA
{
	dnaManifest,
	stdenv,
	json2yaml,
	runCommandNoCC,
	writeText,
	holochain,
	zomes ? {}
}:

let
	zomeSrcs = builtins.attrValues zomes;

  # Recurse over the zomes, and add the correct bundled zome package by name

	manifest = (holochain.legacyPackages.callPackage ./import-yaml.nix {}) dnaManifest;
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
	dnaManifestYaml = runCommandNoCC "json-to-yaml" {} ''
		${json2yaml}/bin/json2yaml ${dnaManifestJson} $out
	'';

in
  stdenv.mkDerivation {
	  name = manifest.name;
		srcs = [ zomeSrcs dnaManifestYaml ];
	  nativeBuildInputs = [ holochain.packages.holochain ];
		phases = [ "buildPhase" ];
		buildPhase = ''
		  mkdir workdir
			cp ${dnaManifestYaml} workdir/dna.yaml
			hc dna pack workdir
			mv workdir/${manifest.name}.dna $out
 		'';
		meta = {
			holochainPackageType = "dna";
		};
	}

# Build a DNA
{
	happManifest,
	stdenv,
	holochain,
	writeText,
	json2yaml,
	runCommandNoCC,
	dnas ? {}
}:

let
	dnaSrcs = builtins.attrValues dnas;

  # Recurse over the DNA roles, and add the correct bundled DNA package by name

	manifest = (holochain.legacyPackages.callPackage ./import-yaml.nix {}) happManifest;
	dnaToBundled = role: role // {
	  dna = role.dna // {
			bundled = dnas.${role.name};
		};
	};
	roles = builtins.map dnaToBundled manifest.roles;

	manifest' = manifest // {
		roles = roles;
	};

	happManifestJson = writeText "happ.json" (builtins.toJSON manifest');
	happManifestYaml = runCommandNoCC "json-to-yaml" {} ''
		${json2yaml}/bin/json2yaml ${happManifestJson} $out
	'';
in
  stdenv.mkDerivation {
	  name = manifest.name;
		srcs = [ dnaSrcs happManifestYaml ];
	  nativeBuildInputs = [ holochain.packages.holochain ];
		phases = [ "buildPhase" ];
		buildPhase = ''
		  mkdir workdir
			cp ${happManifestYaml} workdir/happ.yaml
			hc app pack workdir
			mv workdir/${manifest.name}.happ $out
 		'';
		meta = {
			holochainPackageType = "happ";
		};
	}

# Build a hApp
{
	happManifest,
	holochain,
	writeText,
	json2yaml,
	callPackage,
	runCommandNoCC,
	runCommandLocal,
	dnas ? {}
}:

let
	dnaSrcs = builtins.attrValues dnas;

  # Recurse over the DNA roles, and add the correct bundled DNA package by name

	manifest = (callPackage ./import-yaml.nix {}) happManifest;
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
	debug = let
		# Recurse over the DNA roles, and add the correct bundled DNA package by name

		manifest = (callPackage ./import-yaml.nix {}) happManifest;
		dnaToBundled = role: role // {
			dna = role.dna // {
				bundled = dnas.${role.name}.meta.debug;
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
		runCommandLocal manifest.name {
			srcs = builtins.map (dna: dna.meta.debug) dnaSrcs;
			meta = {
				holochainPackageType = "happ";
			};
		} ''
			mkdir workdir
			cp ${happManifestYaml} workdir/happ.yaml
			${holochain.packages.holochain}/bin/hc app pack workdir
			mv workdir/${manifest.name}.happ $out
		'';
in
  runCommandLocal manifest.name {
		srcs = dnaSrcs;
		meta = {
			inherit debug;
			holochainPackageType = "happ";
		};
	} ''
	  mkdir workdir
		cp ${happManifestYaml} workdir/happ.yaml
		${holochain.packages.holochain}/bin/hc app pack workdir
		mv workdir/${manifest.name}.happ $out
	''

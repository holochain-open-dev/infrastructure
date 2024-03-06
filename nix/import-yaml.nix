{
	runCommandLocal,
	yj
}:

file: builtins.fromJSON (builtins.readFile (runCommandLocal "converted-yaml.json" {} ''${yj}/bin/yj < "${file}" > "$out"''))

{
	runCommandNoCC,
	yj
}:

file: builtins.fromJSON (builtins.readFile (runCommandNoCC "converted-yaml.json" {} ''${yj}/bin/yj < "${file}" > "$out"''))

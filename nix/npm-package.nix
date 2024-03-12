{
	pkgs,
	workspacePath,
	rootPath
}:

let 
  rootPackageJson = builtins.fromJSON (builtins.readFile "${rootPath}/package.json");
  packageJson = builtins.fromJSON (builtins.readFile "${workspacePath}/package.json");

  # Substract the root path to the workspacePath to get the relative path between them.
  # Eg:
  # rootPath = /home/username/project
  # workspacePath = /home/username/project/workspace 
  # And produce
  # npmWorkspace = ./workspace
  rootPathSplit = pkgs.lib.strings.splitString "/" rootPath;
  workspacePathSplit = pkgs.lib.strings.splitString "/" workspacePath;
  npmWorkspace = pkgs.lib.lists.sublist ((builtins.length workspacePathSplit) - (builtins.length rootPathSplit)) (builtins.length workspacePathSplit) workspacePathSplit;

  builtNodeModules = pkgs.buildNpmPackage {
    pname = packageJson.name;
    version = "0.0.0";
    src = rootPath;
    inherit npmWorkspace;
    npmDeps = pkgs.importNpmLock {
      npmRoot = rootPath;
    };
    npmConfigHook = pkgs.importNpmLock.npmConfigHook;
  };
in
  pkgs.runCommandLocal packageJson.name {
		meta = {
			holochainPackageType = "npm";
			packageName = packageJson.name;
		};
	} ''
    set -e
    cd ${builtNodeModules}/lib/node_modules/${rootPackageJson.name}
    mkdir $out
    mkdir $out/lib
    ${pkgs.rsync}/bin/rsync -aP --exclude=node_modules ./* $out/lib
  ''

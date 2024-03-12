{
	pkgs,
	workspacePath,
	rootPath
}:

let 
  rootPackageJson = builtins.fromJSON (builtins.readFile "${rootPath}/package.json");
  packageJson = builtins.fromJSON (builtins.readFile "${workspacePath}/package.json");
  builtNodeModules = pkgs.buildNpmPackage {
    pname = packageJson.name;
    version = "0.0.0";
    src = rootPath;
    npmWorkspace = workspacePath;
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

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
  npmWorkspace = pkgs.lib.lists.sublist (builtins.length rootPathSplit) (builtins.length workspacePathSplit) workspacePathSplit;

  # builtNodeModules = pkgs.buildNpmPackage {
  #   pname = packageJson.name;
  #   version = packageJson.version;
  #   dontNpmPrune = true;
  #   src = rootPath;
  #   npmWorkspace = "./${pkgs.lib.strings.concatStringsSep "/" npmWorkspace}";
  #   npmDeps = pkgs.importNpmLock {
  #     npmRoot = rootPath;
  #   };
  #   npmConfigHook = pkgs.importNpmLock.npmConfigHook;
  # };
    # Read the package-lock.json as a Nix attrset
  packageLock = builtins.fromJSON (builtins.readFile (rootPath + "/package-lock.json"));

  # Create an array of all (meaningful) dependencies
  deps = builtins.attrValues (removeAttrs packageLock.packages [ "" ])
    # ++ builtins.attrValues (removeAttrs packageLock.dependencies [ "" ])
  ;

  # Turn each dependency into a fetchurl call
  tarballs = map (p: pkgs.fetchurl { url = p.resolved; hash = p.integrity; }) deps;

  # Write a file with the list of tarballs
  tarballsFile = pkgs.writeTextFile {
    name = "tarballs";
    text = builtins.concatStringsSep "\n" tarballs;
  };

in
  pkgs.stdenv.mkDerivation {
    inherit (packageLock) name version;
    src = rootPath;
    buildInputs = [ pkgs.nodejs ];
    buildPhase = ''
      export HOME=$PWD/.home
      export npm_config_cache=$PWD/.npm
      mkdir -p $out/js
      cd $out/js
      cp -r $src/. .

      while read package
      do
        echo "caching $package"
        npm cache add "$package"
      done <${tarballsFile}

      npm ci
    '';

    installPhase = ''
      ln -s $out/js/node_modules/.bin $out/bin
    '';
		meta = {
			holochainPackageType = "npm";
			packageName = packageJson.name;
		};
  }

 #  pkgs.runCommandLocal packageJson.name {
	# 	meta = {
	# 		holochainPackageType = "npm";
	# 		packageName = packageJson.name;
	# 	};
	# } ''
 #    set -e
 #    cd ${builtNodeModules}/lib/node_modules/${rootPackageJson.name}/lib
 #    mkdir $out
 #    mkdir $out/lib
 #    ${pkgs.rsync}/bin/rsync -aP ./* $out/lib
 #  ''
    # ${pkgs.rsync}/bin/rsync -aP --exclude=node_modules ./* $out/lib

{
  runCommandNoCC,
  dockerTools,
  docker,
  workspacePath,
  dbus,
  crateCargoToml,
  buildEnv,
  git,
  systemd,
  meta
}:

let 
  nixFromDockerHub = dockerTools.pullImage {
    imageName = "nixpkgs/nix-flakes";
    imageDigest = "sha256:ae2d8172d75347b040b29b726faf680f35c9beffe3f90d6a93b74fa3d5227774";
    sha256 = "mQYzwbTpkslXAOAq4LX05kNcoPqVHfhzM8yZ9bQ7VgA=";
    finalImageTag = "nixos-23.11";
    finalImageName = "nix";
  };
  image = dockerTools.buildImage {
    name = "build-deterministic-zome";
    tag = "latest";
    fromImage = nixFromDockerHub;

    copyToRoot = buildEnv {
      name = "cargo-workspace";
      pathsToLink = [ workspacePath "/bin" ];
      paths = [ workspacePath git ]; 
    };

    # runAsRoot = ''
    #   #!/bin/bash
    #   echo ${workspacePath}
    #   mkdir -p /build/source
    #   cp -R ${workspacePath}/* /build/source
    #   cd /build/source
    #   git init .
    #   git add .
    #   ls -la
    #   nix --help
    #   nix build .#my_zome.meta.debug
    
    # '';
    config.Cmd = [ "/bin/nix --help"];
  };
in
  runCommandNoCC "container" {
    buildInputs = [dbus];
  } ''
    ${systemd}/bin/systemctl --user start docker
    ${docker}/bin/docker load --input ${image}
    ${docker}/bin/docker run -t -i build-deterministic-zome
  ''

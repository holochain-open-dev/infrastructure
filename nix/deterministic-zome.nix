{
  pkgs,
  runCommandNoCC,
  workspacePath,
  dockerTools,
  crateCargoToml,
  meta
}:

let 

  hello = dockerTools.pullImage {
    imageName = "hello-world";
    imageDigest = "sha256:e2fc4e5012d16e7fe466f5291c476431beaa1f9b90a5c2125b493ed28e2aba57";
    sha256 = "mQYzwbTpkslXAOAi4LX05kNcoPqVHfhzM8yZ9bQ7VgA=";
    # finalImageTag = "nixos-23.11";
    # finalImageName = "nix";
  };

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

    copyToRoot = pkgs.buildEnv {
      name = "cargo-workspace";
      pathsToLink = [ workspacePath "/bin" ];
      paths = [ workspacePath pkgs.git ]; 
    };

    # runAsRoot = ''
      #!/bin/bash
    
    # '';
    # config = {
      # Cmd = [ "/bin/bash"];
      # Volumes = {
      #   "/etc/localtime" = "/etc/localtime";
      # };
    # };
  };
in
  runCommandNoCC "container" {
    src = image;
    buildInputs = with pkgs; [
      docker
      skopeo
    ];
  } ''
  echo ${image}
    docker load --input ${image}
    docker run build-deterministic-zome
  ''

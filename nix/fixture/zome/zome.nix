{ inputs, rootPath, ... }:

{
  perSystem =
    { inputs'
    , ...
    }: {
      packages.my_zome = inputs.hcUtils.outputs.lib.rustZome {
        workspacePath = rootPath;
        holochain = inputs'.holochain;
				cratePath = ./.;
      };
  	};
}



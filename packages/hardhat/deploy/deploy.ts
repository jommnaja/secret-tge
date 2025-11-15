import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHESecretTGE = await deploy("FHESecretTGE", {
    from: deployer,
    log: true,
  });

  console.log(`FHESecretTGE contract: `, deployedFHESecretTGE.address);
};
export default func;
func.id = "deploy_FHESecretTGE"; // id required to prevent reexecution
func.tags = ["FHESecretTGE"];

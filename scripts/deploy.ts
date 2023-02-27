import { ethers } from "hardhat";

async function main() {
  const addresses: string[] = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  ];
  const nbConfirmationsRequired: number = 1;

  const MultiSig = await ethers.getContractFactory("MultiSig");
  const multiSig = await MultiSig.deploy(addresses, nbConfirmationsRequired);
  await multiSig.deployed();
  console.log(`MultiSig deployed to ${multiSig.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

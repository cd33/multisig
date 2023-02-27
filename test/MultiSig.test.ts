import { expect } from "chai";
import { ethers } from "hardhat";
import { MultiSig } from "../typechain-types";

const addresses: string[] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
];
const nbConfirmationsRequired: number = 1;

describe("MultiSig Tests", function () {
  let multiSig: MultiSig;

  beforeEach(async function () {
    [this.owner, this.investor, this.user] = await ethers.getSigners(); // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 et 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
    const MultiSig = await ethers.getContractFactory("MultiSig");
    multiSig = await MultiSig.deploy(
      addresses,
      nbConfirmationsRequired
    );
    await multiSig.deployed();
  });

  describe("Simulation", function () {
    it("Should work baby !", async function () {
      const owners = await multiSig.getOwners()
      console.log('owners :>> ', owners);
      const nbConfirmationsRequired = await multiSig.nbConfirmationsRequired()
      console.log('nbConfirmationsRequired :>> ', nbConfirmationsRequired);
      const transactionCount = await multiSig.getTransactionCount()
      console.log('transactionCount :>> ', transactionCount);
    });
  });
});

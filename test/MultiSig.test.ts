import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { MultiSig } from "../typechain-types";

const addresses: string[] = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
];
const nbConfirmationsRequired: number = 3;

const gasRoundedValue = (value: number) => Math.ceil(value * 10 ** 3) / 10 ** 3;

describe("MultiSig Tests", function () {
  let multiSig: MultiSig;

  beforeEach(async function () {
    [this.owner, this.investor, this.user, this.toto, this.badguy] =
      await ethers.getSigners();
    // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 0x90F79bf6EB2c4f870365E785982E1f101E93b906
    // 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
    const MultiSig = await ethers.getContractFactory("MultiSig");
    multiSig = await MultiSig.deploy(addresses, nbConfirmationsRequired);
    await multiSig.deployed();
  });

  describe("Requires Constructor", function () {
    it("REVERT: Owners required", async function () {
      const MultiSig = await ethers.getContractFactory("MultiSig");
      await expect(
        MultiSig.deploy([], nbConfirmationsRequired)
      ).to.be.revertedWith("Owners required");
    });

    it("REVERT: Wrong number", async function () {
      const MultiSig = await ethers.getContractFactory("MultiSig");
      await expect(MultiSig.deploy(addresses, 0)).to.be.revertedWith(
        "Wrong number"
      );
      await expect(MultiSig.deploy(addresses, 5)).to.be.revertedWith(
        "Wrong number"
      );
    });

    it("REVERT: Address Zero", async function () {
      const MultiSig = await ethers.getContractFactory("MultiSig");
      await expect(
        MultiSig.deploy(["0x0000000000000000000000000000000000000000"], 1)
      ).to.be.revertedWith("Address Zero");
    });

    it("REVERT: Duplicated address", async function () {
      const MultiSig = await ethers.getContractFactory("MultiSig");
      await expect(
        MultiSig.deploy([this.owner.address, this.owner.address], 1)
      ).to.be.revertedWith("Duplicated address");
    });
  });

  describe("Requires OnlyOwner", function () {
    it("REVERT: submit and Not enough funds", async function () {
      await expect(
        multiSig.submit(
          this.owner.address,
          ethers.utils.parseEther("1"),
          ethers.utils.formatBytes32String("test")
        )
      ).to.be.revertedWith("Not enough funds");

      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });

      await expect(
        multiSig
          .connect(this.badguy)
          .submit(
            this.badguy.address,
            ethers.utils.parseEther("1"),
            ethers.utils.formatBytes32String("test")
          )
      ).to.be.revertedWith("Not Owner");

      await expect(
        multiSig.submit(
          this.owner.address,
          ethers.utils.parseEther("1"),
          ethers.utils.formatBytes32String("test")
        )
      ).to.be.not.reverted;
      await expect(
        multiSig
          .connect(this.investor)
          .submit(
            this.investor.address,
            ethers.utils.parseEther("1"),
            ethers.utils.formatBytes32String("test")
          )
      ).to.be.not.reverted;
      await expect(
        multiSig
          .connect(this.user)
          .submit(
            this.user.address,
            ethers.utils.parseEther("1"),
            ethers.utils.formatBytes32String("test")
          )
      ).to.be.not.reverted;
    });

    it("REVERT: approve", async function () {
      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });

      await multiSig.submit(
        this.owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.formatBytes32String("test")
      );
      await expect(multiSig.connect(this.badguy).approve(0)).to.be.revertedWith(
        "Not Owner"
      );
      await expect(multiSig.approve(0)).to.be.not.reverted;
      await expect(multiSig.connect(this.investor).approve(0)).to.be.not
        .reverted;
      await expect(multiSig.connect(this.user).approve(0)).to.be.not.reverted;
    });

    it("REVERT: revoke", async function () {
      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });

      await multiSig.submit(
        this.owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.formatBytes32String("test")
      );
      await multiSig.approve(0);
      await multiSig.connect(this.investor).approve(0);
      await multiSig.connect(this.user).approve(0);
      await expect(multiSig.connect(this.badguy).revoke(0)).to.be.revertedWith(
        "Not Owner"
      );
      await expect(multiSig.revoke(0)).to.be.not.reverted;
      await expect(multiSig.connect(this.investor).revoke(0)).to.be.not
        .reverted;
      await expect(multiSig.connect(this.user).revoke(0)).to.be.not.reverted;
    });
  });

  describe("Requires txExists", function () {
    it("REVERT: approve", async function () {
      await expect(
        multiSig.connect(this.investor).approve(1)
      ).to.be.revertedWith("Tx doesn't exist");
    });

    it("REVERT: revoke", async function () {
      await expect(
        multiSig.connect(this.investor).approve(1)
      ).to.be.revertedWith("Tx doesn't exist");
    });

    it("REVERT: execute", async function () {
      await expect(
        multiSig.connect(this.investor).approve(1)
      ).to.be.revertedWith("Tx doesn't exist");
    });
  });

  describe("Requires notApproved", function () {
    it("REVERT: approve", async function () {
      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });
      await multiSig.submit(
        this.owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.formatBytes32String("test")
      );
      await multiSig.connect(this.investor).approve(0);
      await expect(
        multiSig.connect(this.investor).approve(0)
      ).to.be.revertedWith("Tx already approved");
    });
  });

  describe("Requires notExecuted", function () {
    it("REVERT: approve", async function () {
      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });
      await multiSig.submit(
        this.owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.formatBytes32String("test")
      );
      await multiSig.approve(0);
      await multiSig.connect(this.user).approve(0);
      await multiSig.connect(this.toto).approve(0);
      await multiSig.connect(this.investor).execute(0);
      await expect(
        multiSig.connect(this.investor).approve(0)
      ).to.be.revertedWith("Tx already executed");
    });

    it("REVERT: revoke and Tx not approved", async function () {
      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });
      await multiSig.submit(
        this.owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.formatBytes32String("test")
      );
      await multiSig.approve(0);
      await multiSig.connect(this.user).approve(0);
      await multiSig.connect(this.toto).approve(0);
      await expect(
        multiSig.connect(this.investor).revoke(0)
      ).to.be.revertedWith("Tx not approved");
      await multiSig.connect(this.investor).execute(0);
      await expect(
        multiSig.connect(this.investor).revoke(0)
      ).to.be.revertedWith("Tx already executed");
    });

    it("REVERT: execute and Not enough approvals", async function () {
      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });
      await multiSig.submit(
        this.owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.formatBytes32String("test")
      );
      await multiSig.approve(0);
      await multiSig.connect(this.user).approve(0);
      await expect(
        multiSig.connect(this.investor).execute(0)
      ).to.be.revertedWith("Not enough approvals");
      await multiSig.connect(this.toto).approve(0);
      await multiSig.connect(this.investor).execute(0);
      await expect(
        multiSig.connect(this.investor).execute(0)
      ).to.be.revertedWith("Tx already executed");
    });
  });

  describe("Getters and Check balances", function () {
    it("Should work baby !", async function () {
      const owners = await multiSig.getOwners();
      expect(
        owners.every((address, index) => address === addresses[index])
      ).to.equal(true);
      const nbConfirmations = await multiSig.nbConfirmationsRequired();
      expect(nbConfirmations).to.equal(nbConfirmationsRequired);
      const transactionCount = await multiSig.getTransactionCount();
      expect(transactionCount).to.equal(0);

      const balanceOwnerBefore = await this.owner.getBalance();
      const balanceInvestorBefore = await this.investor.getBalance();
      const balanceContractBefore = await ethers.provider.getBalance(
        multiSig.address
      );
      expect(balanceContractBefore).to.equal(0);

      await this.owner.sendTransaction({
        to: multiSig.address,
        value: ethers.utils.parseEther("1"),
      });
      await multiSig
        .connect(this.investor)
        .submit(
          this.investor.address,
          ethers.utils.parseEther("1"),
          ethers.utils.formatBytes32String("test")
        );
      const tx = await multiSig.connect(this.investor).getTransaction(0);
      expect(tx.to).to.equal(this.investor.address);
      expect(tx.value).to.equal(ethers.utils.parseEther("1"));
      expect(tx.nbConfirmations).to.equal(0);
      expect(tx.data).to.equal(ethers.utils.formatBytes32String("test"));
      expect(tx.executed).to.equal(false);

      const balanceOwnerDuring = await this.owner.getBalance();
      const balanceInvestorDuring = await this.investor.getBalance();
      const balanceContractDuring = await ethers.provider.getBalance(
        multiSig.address
      );
      expect(
        gasRoundedValue(
          Number(ethers.utils.formatEther(balanceOwnerDuring.toString()))
        )
      ).to.equal(
        gasRoundedValue(
          Number(ethers.utils.formatEther(balanceOwnerBefore.toString())) - 1
        )
      );
      expect(balanceInvestorDuring).to.be.lt(balanceInvestorBefore);
      expect(balanceContractDuring).to.equal(ethers.utils.parseEther("1"));

      await multiSig.approve(0);
      await multiSig.connect(this.user).approve(0);
      await multiSig.connect(this.investor).approve(0);
      await multiSig.connect(this.investor).execute(0);

      const balanceOwnerAfter = await this.owner.getBalance();
      const balanceInvestorAfter = await this.investor.getBalance();
      const balanceContractAfter = await ethers.provider.getBalance(
        multiSig.address
      );
      expect(
        gasRoundedValue(
          Number(ethers.utils.formatEther(balanceOwnerAfter.toString()))
        )
      ).to.equal(
        gasRoundedValue(
          Number(ethers.utils.formatEther(balanceOwnerDuring.toString()))
        )
      );
      expect(
        gasRoundedValue(
          Number(ethers.utils.formatEther(balanceInvestorAfter.toString()))
        )
      ).to.equal(
        gasRoundedValue(
          Number(ethers.utils.formatEther(balanceInvestorDuring.toString())) + 1
        )
      );
      expect(balanceContractAfter).to.equal(0);
    });
  });
});

import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FHESecretTGE, FHESecretTGE__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Users = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function setupContract() {
  const factory = (await ethers.getContractFactory("FHESecretTGE")) as FHESecretTGE__factory;
  const contract = (await factory.deploy()) as FHESecretTGE;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("FHESecretTGE – Encrypted Predictions", function () {
  let signers: Users;
  let secretTGE: FHESecretTGE;
  let tgeAddress: string;

  before(async function () {
    const s = await ethers.getSigners();
    signers = { owner: s[0], alice: s[1], bob: s[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) this.skip(); // only mock FHEVM
    ({ contract: secretTGE, address: tgeAddress } = await setupContract());
  });

  it("users initially have no prediction", async function () {
    expect(await secretTGE.hasPrediction(signers.alice.address)).to.eq(false);
    expect(await secretTGE.hasPrediction(signers.bob.address)).to.eq(false);
  });

  it("allows a user to submit and update encrypted prediction", async function () {
    const firstDate = 1672531200; // example timestamp
    const secondDate = 1672617600;

    // --- First submission ---
    const firstEnc = await fhevm.createEncryptedInput(tgeAddress, signers.alice.address).add32(firstDate).encrypt();

    await (await secretTGE.connect(signers.alice).submitPrediction(firstEnc.handles[0], firstEnc.inputProof)).wait();
    expect(await secretTGE.hasPrediction(signers.alice.address)).to.eq(true);

    let dec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await secretTGE.encryptedPredictionOf(signers.alice.address),
      tgeAddress,
      signers.alice,
    );
    expect(dec).to.eq(firstDate);

    // --- Update prediction ---
    const secondEnc = await fhevm.createEncryptedInput(tgeAddress, signers.alice.address).add32(secondDate).encrypt();

    await (await secretTGE.connect(signers.alice).submitPrediction(secondEnc.handles[0], secondEnc.inputProof)).wait();

    dec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await secretTGE.encryptedPredictionOf(signers.alice.address),
      tgeAddress,
      signers.alice,
    );
    expect(dec).to.eq(secondDate);
  });

  it("handles multiple users submitting predictions independently", async function () {
    const aliceDate = 1673000000;
    const bobDate = 1673500000;

    const aliceEnc = await fhevm.createEncryptedInput(tgeAddress, signers.alice.address).add32(aliceDate).encrypt();
    const bobEnc = await fhevm.createEncryptedInput(tgeAddress, signers.bob.address).add32(bobDate).encrypt();

    await (await secretTGE.connect(signers.alice).submitPrediction(aliceEnc.handles[0], aliceEnc.inputProof)).wait();
    await (await secretTGE.connect(signers.bob).submitPrediction(bobEnc.handles[0], bobEnc.inputProof)).wait();

    const aliceDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await secretTGE.encryptedPredictionOf(signers.alice.address),
      tgeAddress,
      signers.alice,
    );
    const bobDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await secretTGE.encryptedPredictionOf(signers.bob.address),
      tgeAddress,
      signers.bob,
    );

    expect(aliceDec).to.eq(aliceDate);
    expect(bobDec).to.eq(bobDate);
    expect(await secretTGE.hasPrediction(signers.alice.address)).to.eq(true);
    expect(await secretTGE.hasPrediction(signers.bob.address)).to.eq(true);
  });

  it("allows revoking and granting decryption rights", async function () {
    const value = 1674500000;
    const enc = await fhevm.createEncryptedInput(tgeAddress, signers.alice.address).add32(value).encrypt();
    await (await secretTGE.connect(signers.alice).submitPrediction(enc.handles[0], enc.inputProof)).wait();

    // grant decryption to bob
    await secretTGE.connect(signers.alice).grantDecryption(signers.bob.address);

    // Bob can decrypt now
    const bobDec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await secretTGE.encryptedPredictionOf(signers.alice.address),
      tgeAddress,
      signers.bob,
    );
    expect(bobDec).to.eq(value);
  });
});

// Unit tests for the TokenizeArt42 NFT contract.
// Run from ./deployment with:  npx hardhat test

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const SAMPLE_URI = "ipfs://bafkreisampleTokenizeArt42metadata";

describe("TokenizeArt42", function () {
  // Deploys a fresh contract owned by `owner` for every test.
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("TokenizeArt42");
    const nft = await factory.deploy(owner.address);
    return { nft, owner, alice, bob };
  }

  describe("Deployment", function () {
    it("sets name, symbol, artist and owner", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      expect(await nft.name()).to.equal("TokenizeArt42");
      expect(await nft.symbol()).to.equal("TA42");
      expect(await nft.ARTIST()).to.equal("abasante");
      expect(await nft.owner()).to.equal(owner.address);
      expect(await nft.totalMinted()).to.equal(0n);
    });

    it("supports the ERC-721 and ERC-721 Metadata interfaces", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true); // ERC721
      expect(await nft.supportsInterface("0x5b5e139f")).to.equal(true); // ERC721Metadata
    });
  });

  describe("Minting", function () {
    it("lets the owner mint, and ownerOf / tokenURI / balanceOf reflect it", async function () {
      const { nft, alice } = await loadFixture(deployFixture);

      await expect(nft.mint(alice.address, SAMPLE_URI))
        .to.emit(nft, "ArtMinted")
        .withArgs(alice.address, 1n, SAMPLE_URI)
        .and.to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, 1n);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.tokenURI(1n)).to.equal(SAMPLE_URI);
      expect(await nft.balanceOf(alice.address)).to.equal(1n);
      expect(await nft.totalMinted()).to.equal(1n);
    });

    it("assigns sequential token ids starting at 1", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await nft.mint(alice.address, SAMPLE_URI);
      await nft.mint(bob.address, SAMPLE_URI);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
    });

    it("rejects minting by a non-owner", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).mint(alice.address, SAMPLE_URI))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("rejects an empty metadata URI", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.mint(alice.address, "")).to.be.revertedWithCustomError(
        nft,
        "EmptyMetadataURI"
      );
    });

    it("rejects minting to the zero address", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.mint(ethers.ZeroAddress, SAMPLE_URI)).to.be.revertedWithCustomError(
        nft,
        "ERC721InvalidReceiver"
      );
    });

    it("enforces MAX_SUPPLY", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      const maxSupply = await nft.MAX_SUPPLY();
      for (let i = 0n; i < maxSupply; i++) {
        await nft.mint(alice.address, SAMPLE_URI);
      }
      await expect(nft.mint(alice.address, SAMPLE_URI)).to.be.revertedWithCustomError(
        nft,
        "MaxSupplyReached"
      );
    });

    it("reverts ownerOf / tokenURI for a token that does not exist", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.ownerOf(99n)).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
      await expect(nft.tokenURI(99n)).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
    });
  });

  describe("Transfers (holder rights)", function () {
    it("lets a holder transfer their NFT", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await nft.mint(alice.address, SAMPLE_URI);
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });

    it("does NOT let the contract owner move someone else's NFT", async function () {
      const { nft, owner, alice, bob } = await loadFixture(deployFixture);
      await nft.mint(alice.address, SAMPLE_URI);
      await expect(nft.connect(owner).transferFrom(alice.address, bob.address, 1n))
        .to.be.revertedWithCustomError(nft, "ERC721InsufficientApproval")
        .withArgs(owner.address, 1n);
    });

    it("lets an approved address transfer the NFT", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await nft.mint(alice.address, SAMPLE_URI);
      await nft.connect(alice).approve(bob.address, 1n);
      await nft.connect(bob).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });
  });

  describe("Ownership (privileges)", function () {
    it("uses a two-step ownership transfer", async function () {
      const { nft, owner, alice } = await loadFixture(deployFixture);
      await nft.transferOwnership(alice.address);
      // Ownership has not moved yet, only a pending owner is recorded.
      expect(await nft.owner()).to.equal(owner.address);
      expect(await nft.pendingOwner()).to.equal(alice.address);

      await nft.connect(alice).acceptOwnership();
      expect(await nft.owner()).to.equal(alice.address);
      // The old owner lost the mint privilege.
      await expect(nft.connect(owner).mint(owner.address, SAMPLE_URI)).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });

    it("only lets the pending owner accept ownership", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await nft.transferOwnership(alice.address);
      await expect(nft.connect(bob).acceptOwnership()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });

    it("disables renounceOwnership", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.renounceOwnership()).to.be.revertedWithCustomError(
        nft,
        "RenounceOwnershipDisabled"
      );
      await expect(nft.connect(alice).renounceOwnership()).to.be.revertedWithCustomError(
        nft,
        "OwnableUnauthorizedAccount"
      );
    });
  });
});

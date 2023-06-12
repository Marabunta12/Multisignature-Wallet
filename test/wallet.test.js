const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");

describe("Wallet", function () {
    let wallet, owner;
    beforeEach(async function () {
        await deployments.fixture("wallet");
        wallet = await ethers.getContract("MultiSignatureWallet");
        owner = (await getNamedAccounts()).owner;
    });
    describe("constructor", function () {
        it("reverts if wallet has no owners", async function () {
            const walletFactory = await ethers.getContractFactory("MultiSignatureWallet");
            await expect(walletFactory.deploy([])).to.be.revertedWithCustomError(
                walletFactory,
                "MultiSignatureWallet__OwnersRequired"
            );
        });

        it("reverts if owner is invalid", async function () {
            const walletFactory = await ethers.getContractFactory("MultiSignatureWallet");
            await expect(
                walletFactory.deploy([
                    "0x0000000000000000000000000000000000000000",
                    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ])
            ).to.be.revertedWithCustomError(walletFactory, "MultiSignatureWallet__InvalidOwner");
        });
        it("reverts if owners are not unique", async function () {
            const walletFactory = await ethers.getContractFactory("MultiSignatureWallet");
            await expect(
                walletFactory.deploy([
                    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ])
            ).to.be.revertedWithCustomError(walletFactory, "MultiSignatureWallet__NotUnigueOwner");
        });
        it("updates s_isOwner mapping", async function () {
            let isOwner = await wallet.isOwner("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
            assert.equal(isOwner, true);
            isOwner = await wallet.isOwner("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
            assert.equal(isOwner, true);
        });

        it("updates owners array", async function () {
            const owners = await wallet.getOwners();
            assert.equal(owners.length, 2);
            assert.equal(owners[0], "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
            assert.equal(owners[1], "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
        });
    });
    describe("receive", function () {
        it("emits an event after depositing money", async function () {});
    });
});

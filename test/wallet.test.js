const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");

describe("Wallet", function () {
    let wallet, notOwnerConnectedWallet, owner, secondOwnerConnectedWallet, accounts, depositor;
    beforeEach(async function () {
        await deployments.fixture("wallet");
        wallet = await ethers.getContract("MultiSignatureWallet");
        notOwner = (await getNamedAccounts()).notOwner;
        owner = (await getNamedAccounts()).owner;
        notOwnerConnectedWallet = await ethers.getContract("MultiSignatureWallet", notOwner);
        secondOwner = (await getNamedAccounts()).secondOwner;
        secondOwnerConnectedWallet = await ethers.getContract("MultiSignatureWallet", secondOwner);
        accounts = await ethers.getSigners(0);
        depositor = accounts[0];
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
        it("emits an event after depositing money", async function () {
            expect(
                await depositor.sendTransaction({
                    to: wallet.address,
                    value: ethers.utils.parseEther("1.0"),
                })
            )
                .to.emit("DepositFunds")
                .withArgs(depositor, ethers.utils.parseEther("1.0"));
        });
    });
    describe("submitTransaction", function () {
        it("updates transactions array correctly", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await expect(wallet.s_transactions.length, 1);
            const { to, value, executed, numConfirmations } = await wallet.getTransaction(0);
            assert.equal(to, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
            assert.equal(value.toString(), ethers.utils.parseEther("1.0").toString());
            assert.equal(executed, false);
            assert.equal(numConfirmations, 0);
        });
        it("emits an event after submitting transaction", async function () {
            expect(
                await wallet.submitTransaction(
                    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                    ethers.utils.parseEther("1.0")
                )
            )
                .to.emit("SubmitTransaction")
                .withArgs(0);
        });
        it("reverts if not owner tries to submit transaction", async function () {
            await expect(
                notOwnerConnectedWallet.submitTransaction(
                    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                    ethers.utils.parseEther("1.0")
                )
            ).to.be.revertedWithCustomError(
                notOwnerConnectedWallet,
                "MultiSignatureWallet__NotOwner"
            );
        });
    });
    describe("approveTransaction", async function () {
        it("reverts if transaction does not exist", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );

            await expect(wallet.approveTransaction(21)).to.be.revertedWithCustomError(
                notOwnerConnectedWallet,
                "MultiSignatureWallet__TransactionDoesNotExist"
            );
        });
        it("reverts if not owner tries to approve transaction", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await expect(
                notOwnerConnectedWallet.approveTransaction(0)
            ).to.be.revertedWithCustomError(
                notOwnerConnectedWallet,
                "MultiSignatureWallet__NotOwner"
            );
        });
        it("reverts if transaction was already approved", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await expect(wallet.approveTransaction(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__AlreadyApproved"
            );
        });
        it("reverts if transaction was already executed", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await wallet.executeTransaction(0);
            await expect(wallet.executeTransaction(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__AlreadyExecuted"
            );
        });
        it("updates isApprovedTransaction mapping", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            const isApproved = await wallet.getIsApprovedTransaction(0, owner);
            assert.equal(isApproved, true);
        });
        it("updates transactions array", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            const { numConfirmations } = await wallet.getTransaction(0);
            assert.equal(numConfirmations, 1);
        });
        it("emits an event after approving transaction", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            expect(await wallet.approveTransaction(0))
                .to.emit("ApproveTransaction")
                .withArgs(owner, 0);
        });
    });
    describe("revokeApproval", function () {
        it("reverts if not owner tries to revoke approval", async function () {
            await wallet.submitTransaction(owner, ethers.utils.parseEther("1.0"));
            await wallet.approveTransaction(0);
            await expect(notOwnerConnectedWallet.revokeApproval(0)).to.be.revertedWithCustomError(
                notOwnerConnectedWallet,
                "MultiSignatureWallet__NotOwner"
            );
        });
        it("reverts if transaction does not exist", async function () {
            await wallet.submitTransaction(owner, ethers.utils.parseEther("1.0"));
            await wallet.approveTransaction(0);
            await expect(wallet.revokeApproval(1)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__TransactionDoesNotExist"
            );
        });
        it("reverts if transaction was not approved", async function () {
            await wallet.submitTransaction(owner, ethers.utils.parseEther("1.0"));
            await expect(wallet.revokeApproval(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__NotApproved"
            );
        });
        it("reverts if transaction was already executed", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(owner, ethers.utils.parseEther("1.0"));
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await wallet.executeTransaction(0);
            await expect(wallet.revokeApproval(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__AlreadyExecuted"
            );
        });
        it("updates isApprovedTransaction mapping", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await wallet.revokeApproval(0);
            const isApproved = await wallet.getIsApprovedTransaction(0, owner);
            assert.equal(isApproved, false);
        });
        it("updates transactions array", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await wallet.revokeApproval(0);
            const { numConfirmations } = await wallet.getTransaction(0);
            assert.equal(numConfirmations, 0);
        });
        it("emits an event after revoking approval", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            expect(await wallet.revokeApproval(0))
                .to.emit("RevokeApproval")
                .withArgs(owner, 0);
        });
    });
    describe("executeTransaction", function () {
        it("reverts if not owner tries to execute transaction", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await expect(
                notOwnerConnectedWallet.executeTransaction(0)
            ).to.be.revertedWithCustomError(
                notOwnerConnectedWallet,
                "MultiSignatureWallet__NotOwner"
            );
        });
        it("reverts if transaction does not exist", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await expect(wallet.executeTransaction(1)).to.be.revertedWithCustomError(
                notOwnerConnectedWallet,
                "MultiSignatureWallet__TransactionDoesNotExist"
            );
        });
        it("reverts if transaction was already executed", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await wallet.executeTransaction(0);
            await expect(wallet.executeTransaction(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__AlreadyExecuted"
            );
        });
        it("reverts if there is not enough approvals", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await expect(wallet.executeTransaction(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__NotEnoughApprovals"
            );
        });
        it("updates transactions array correctly", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await wallet.executeTransaction(0);
            const { executed } = await wallet.getTransaction(0);
            assert.equal(executed, true);
        });
        it("executes transaction correctly", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);

            const startingOwnerBalance = await ethers.provider.getBalance(owner);
            const startingWalletBalance = await ethers.provider.getBalance(wallet.address);

            const transactionResponse = await wallet.executeTransaction(0);
            const transactionReceipt = await transactionResponse.wait();
            const { gasUsed, effectiveGasPrice } = transactionReceipt;
            const gasCost = gasUsed.mul(effectiveGasPrice);

            const endingOwnerBalance = await ethers.provider.getBalance(owner);
            const endingWalletBalance = await ethers.provider.getBalance(wallet.address);

            assert.equal(
                endingWalletBalance.toString(),
                startingWalletBalance.sub(ethers.utils.parseEther("1.0")).toString()
            );
            assert.equal(
                startingOwnerBalance.add(ethers.utils.parseEther("1.0")).sub(gasCost).toString(),
                endingOwnerBalance.toString()
            );
        });
        it("reverts if transaction was not successful", async function () {
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            await expect(wallet.executeTransaction(0)).to.be.revertedWithCustomError(
                wallet,
                "MultiSignatureWallet__FailedToSendETH"
            );
        });
        it("emits an event after executing transaction", async function () {
            await depositor.sendTransaction({
                to: wallet.address,
                value: ethers.utils.parseEther("3.0"),
            });
            await wallet.submitTransaction(
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                ethers.utils.parseEther("1.0")
            );
            await wallet.approveTransaction(0);
            await secondOwnerConnectedWallet.approveTransaction(0);
            expect(await wallet.executeTransaction(0))
                .to.emit("ExecuteTransaction")
                .withArgs(0);
        });
    });
});

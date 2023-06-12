module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let args = [
        [
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        ],
    ];

    await deploy("MultiSignatureWallet", {
        from: deployer,
        args: args,
        log: true,
    });
};

module.exports.tags = ["wallet"];

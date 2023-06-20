module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer, owner, secondOwner } = await getNamedAccounts();

    let args = [[owner, secondOwner]];

    await deploy("MultiSignatureWallet", {
        from: deployer,
        args: args,
        log: true,
    });
};

module.exports.tags = ["wallet"];

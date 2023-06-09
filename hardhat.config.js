require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.18",
    namedAccounts: {
        deployer: {
            default: 0,
        },
        owner: {
            default: 0,
        },
        secondOwner: {
            default: 1,
        },
        notOwner: {
            default: 2,
        },
    },
};

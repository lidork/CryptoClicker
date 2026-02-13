// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library AgentMathLib {
    function baseMiningRate(
        string memory agentClass,
        uint256 baseWarrior,
        uint256 baseGuardian,
        uint256 baseSorcerer
    ) external pure returns (uint256) {
        bytes32 classHash = keccak256(bytes(agentClass));

        if (classHash == keccak256(bytes("Warrior"))) {
            return baseWarrior;
        }
        if (classHash == keccak256(bytes("Guardian"))) {
            return baseGuardian;
        }
        if (classHash == keccak256(bytes("Sorcerer"))) {
            return baseSorcerer;
        }

        return baseWarrior;
    }

    function generateXpVariance(uint256 tokenId) external view returns (uint256) {
        uint256 variance = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            tokenId
        )));

        return 8e17 + (variance % 4e17);
    }
}

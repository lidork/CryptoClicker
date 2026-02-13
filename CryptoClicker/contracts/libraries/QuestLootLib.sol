// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library QuestLootLib {
    function rollQuestLoot(
        bytes32 randomSeed,
        uint256 tokenId,
        uint256 strength,
        uint256 questDuration
    ) external pure returns (uint256 tokens, string memory rarity, string memory itemUri) {
        // Use stored random seed from quest start - makes roll deterministic
        uint256 roll = uint256(keccak256(abi.encodePacked(
            randomSeed,
            tokenId,
            strength
        ))) % 100;

        // Scale rewards by quest duration (longer = better)
        uint256 durationMultiplier = (questDuration / 3600) + 1; // Hours + 1

        if (roll < 60) { // Common (60%)
            rarity = "Common";
            tokens = (5 + (roll % 15)) * 1e18 * durationMultiplier;
            itemUri = "";
        } else if (roll < 85) { // Uncommon (25%)
            rarity = "Uncommon";
            tokens = (25 + (roll % 25)) * 1e18 * durationMultiplier;
            itemUri = roll % 3 == 0 ? "ipfs://valid-uri-1" : ""; // 33% chance for Sword
        } else if (roll < 97) { // Rare (12%)
            rarity = "Rare";
            tokens = (75 + (roll % 75)) * 1e18 * durationMultiplier;
            itemUri = roll % 2 == 0 ? "ipfs://valid-uri-1" : "ipfs://valid-uri-2"; // Sword or Shield
        } else { // Epic (3%)
            rarity = "Epic";
            tokens = (200 + (roll % 100)) * 1e18 * durationMultiplier;
            itemUri = "ipfs://valid-uri-3"; // Guaranteed Scepter
        }

        return (tokens, rarity, itemUri);
    }
}

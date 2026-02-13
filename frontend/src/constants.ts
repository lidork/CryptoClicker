export const CLICKER_TOKEN_ADDRESS = "0xC73836e11f70b55316400882345E8DFFcd2A439D";
export const GAME_ITEM_ADDRESS = "0x3de7D8030343F1689E630A1064F4ABCd4A7170f3";

export const CLICKS_PER_TOKEN = 10; // How many clicks to earn 1 token

// Lootbox items (consumable, tradeable, fixed stats)
export const SHOP_ITEMS = [
    { name: "Sword of Clicking", description: "+0.01 to +0.50 Yield", price: 10, uri: "ipfs://valid-uri-1" },
    { name: "Shield of Holding", description: "passive income", price: 50, uri: "ipfs://valid-uri-2" },
    { name: "Scepter of the Infinite", description: "+50 Active & +20 Passive", price: 1000, uri: "ipfs://valid-uri-3" }
];

// Agent classes (persistent, progressive, ERC-8004 lite)
export const AGENT_CLASSES = [
    {
        name: "Warrior",
        description: "The strong class. Moderate mining rate (0.5 CLK/sec). Built for active gameplay.",
        emoji: "⚔️",
        baseMiningRate: 0.5,
        miningRateUnit: "CLK/sec"
    },
    {
        name: "Guardian",
        description: "The balanced class. Standard mining rate (1 CLK/sec). Perfect for balanced play.",
        emoji: "🛡️",
        baseMiningRate: 1,
        miningRateUnit: "CLK/sec"
    },
    {
        name: "Sorcerer",
        description: "The powerful class. High mining rate (2 CLK/sec). Master of passive income.",
        emoji: "🔮",
        baseMiningRate: 2,
        miningRateUnit: "CLK/sec"
    }
];

export const AGENT_MINT_COST = 500; // CLK tokens to create an agent

// Quest system
export const QUEST_DURATIONS = {
  SHORT: { seconds: 3600, label: "1 Hour", multiplier: 1 },
  MEDIUM: { seconds: 21600, label: "6 Hours", multiplier: 3 },
  LONG: { seconds: 86400, label: "24 Hours", multiplier: 8 },
  DEBUG: { seconds: 60, label: "1 Minute (Debug)", multiplier: 0.1 }
};

export const LOOT_RARITIES = {
  COMMON: { chance: 60, color: "#9ca3af", label: "Common" },
  UNCOMMON: { chance: 25, color: "#4ade80", label: "Uncommon" },
  RARE: { chance: 12, color: "#3b82f6", label: "Rare" },
  EPIC: { chance: 3, color: "#a855f7", label: "Epic" }
};
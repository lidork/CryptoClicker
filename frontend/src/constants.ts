export const CLICKER_TOKEN_ADDRESS = "0xf36c9e3931BCEc7D2163297d41bea997b22F2C73";
export const GAME_ITEM_ADDRESS = "0xda28c7912b351a517C8C8bf6969Dfae126250D9a";

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
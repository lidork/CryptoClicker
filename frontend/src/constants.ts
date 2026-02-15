export const CLICKER_TOKEN_ADDRESS = "0xd923AB344141480dD8cCDc526adbeD85753f2083";
export const GAME_ITEM_ADDRESS = "0xf949d3Bea2524c9cc40f1442EB769b579B2A981e";
export const MARKETPLACE_ADDRESS = "0xfd31C5233C93d40E496125C10E44469FF05e5257"; 

// Signer Service API (ERC-8004 Validator)
export const SIGNER_API_URL = import.meta.env.VITE_SIGNER_API || 'http://localhost:3001';
export const VALIDATOR_ADDRESS = "0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab";

export const KNOWN_ADDRESS_LABELS: Record<string, string> = {
    [CLICKER_TOKEN_ADDRESS.toLowerCase()]: "Token Contract",
    [GAME_ITEM_ADDRESS.toLowerCase()]: "GameItem Contract",
    [MARKETPLACE_ADDRESS.toLowerCase()]: "Marketplace Contract",
    [VALIDATOR_ADDRESS.toLowerCase()]: "Validator Service"
};

export const CLICKS_PER_TOKEN = 10; // How many clicks to earn 1 token

// Lootbox items (consumable, tradeable, fixed stats)
export const SHOP_ITEMS = [
    { name: "Sword of Clicking", description: "+0.01 to +0.50 click multiplier per click", price: 10, uri: "ipfs://valid-uri-1" },
    { name: "Shield of Holding", description: "+0.1 to +5 passive clicks per second", price: 50, uri: "ipfs://valid-uri-2" },
    { name: "Scepter of the Infinite", description: "+50 click multiplier & +20 passive clicks/sec", price: 1000, uri: "ipfs://valid-uri-3" }
];

// Agent classes (persistent, progressive, ERC-8004 lite)
export const AGENT_CLASSES = [
    {
        name: "Warrior",
        description: "Strong attacker. +5% click bonus per level when equipped. Low mining rate (0.5 CLK/sec on quests).",
        emoji: "⚔️",
        baseMiningRate: 0.5,
        miningRateUnit: "Click/sec"
    },
    {
        name: "Guardian",
        description: "Balanced defender. +10% passive income per level when equipped. Standard mining (1 CLK/sec on quests).",
        emoji: "🛡️",
        baseMiningRate: 1,
        miningRateUnit: "Click/sec"
    },
    {
        name: "Sorcerer",
        description: "Powerful caster. +2% click & +8% passive per level when equipped. Fast mining (2 CLK/sec on quests).",
        emoji: "🔮",
        baseMiningRate: 2,
        miningRateUnit: "Click/sec"
    }
];


// Quest system
export const QUEST_DURATIONS = {
  SHORT: { seconds: 3600, label: "1 Hour", multiplier: 1 },
  MEDIUM: { seconds: 21600, label: "6 Hours", multiplier: 3 },
  LONG: { seconds: 86400, label: "24 Hours", multiplier: 8 },
  DEBUG: { seconds: 60, label: "1 Minute (Debug)", multiplier: 0.1 }
};

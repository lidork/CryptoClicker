export const CLICKER_TOKEN_ADDRESS = "0x6aEaD5AFA0293d3251dC07152150862695e29622";
export const GAME_ITEM_ADDRESS = "0xB34572c303414Cc97f4D062d1812Ca63f6fFfc56";

// Signer Service API (ERC-8004 Validator)
export const SIGNER_API_URL = import.meta.env.VITE_SIGNER_API || 'http://localhost:3001';
export const VALIDATOR_ADDRESS = "0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab";

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
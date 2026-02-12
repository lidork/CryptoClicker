export const ClickerTokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",

  "function mint(address to, uint256 amount) public",
  "function ownerMint(address to, uint256 amount) public", // Owner-only minting function
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export const GameItemABI = [
  // Standard ERC721 functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)",
  
  // Type & Pricing Functions
  "function getNftType(uint256 tokenId) view returns (uint8)",
  "function getDynamicPrice(string tokenURI, uint256 basePrice) view returns (uint256)",
  "function uriSupply(string tokenURI) view returns (uint256)",
  
  // Lootbox Item Minting & Queries
  "function mintLootboxItem(address player, string tokenURI, uint256 basePrice) external returns (uint256)",
  "function getItemMetadata(uint256 tokenId) view returns (tuple(uint256 purchasePrice, uint256 mintDate, address originalCreator, uint256 strength))",
  "function items(uint256 tokenId) view returns (uint256 purchasePrice, uint256 mintDate, address originalCreator, uint256 strength)",
  
  // Agent NFT Minting & Queries (ERC-8004)
  "function mintAgent(address player, string agentClass, string tokenURI) external returns (uint256)",
  "function getAgentStats(uint256 tokenId) view returns (tuple(uint256 level, uint256 miningRate, uint256 creationTime, uint256 experience, uint256 strength, string agentClass, uint256 xpGainVariance))",
  "function getAgentLevel(uint256 tokenId) view returns (uint256)",
  "function getAgentMiningRate(uint256 tokenId) view returns (uint256)",
  "function getAgentClass(uint256 tokenId) view returns (string)",
  "function getAgentExperience(uint256 tokenId) view returns (uint256 currentXp, uint256 xpToNextLevel)",
  "function getAgentXpVariance(uint256 tokenId) view returns (uint256)",
  "function getAgentSupplyByClass(string agentClass) view returns (uint256)",
  
  // Agent Experience & Leveling
  "function addExperience(uint256 tokenId, uint256 baseXpAmount) external",
  "function setExperience(uint256 tokenId, uint256 xpAmount) external",
  
  // History & Provenance
  "function getItemHistory(uint256 tokenId) view returns (tuple(address from, address to, uint256 timestamp)[])",
  
  // Constants (readable)
  "function PRICE_INCREMENT() view returns (uint256)",
  "function XP_PER_LEVEL() view returns (uint256)",
  "function BASE_WARRIOR_RATE() view returns (uint256)",
  "function BASE_GUARDIAN_RATE() view returns (uint256)",
  "function BASE_SORCERER_RATE() view returns (uint256)",
  "function AGENT_MINT_COST() view returns (uint256)",
  
  // Events - Lootbox
  "event LootboxItemMinted(uint256 indexed tokenId, address indexed owner, string itemType, uint256 price, uint256 strength)",
  
  // Events - Agent
  "event AgentCreated(uint256 indexed tokenId, address indexed creator, string agentClass, uint256 miningRate, uint256 xpVariance)",
  "event AgentLeveledUp(uint256 indexed tokenId, uint256 newLevel, uint256 newMiningRate)",
  "event ExperienceGained(uint256 indexed tokenId, uint256 xpAmount, uint256 totalExperience)",
  
  // Standard ERC721 Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
];
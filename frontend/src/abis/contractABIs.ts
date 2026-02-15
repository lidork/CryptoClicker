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

  // PHASE 3: Updated mint function with ECDSA signature validation
  "function mint(address to, uint256 amount, bytes signature, uint256 nonce) public",
  "function ownerMint(address to, uint256 amount) public", // Owner-only minting function
  
  // PHASE 3: Validator management and nonce tracking
  "function validator() view returns (address)",
  "function getNonce(address user) view returns (uint256)",
  "function setValidator(address newValidator) external",
  "function nonces(address user) view returns (uint256)",
  
  // Burn functionality
  "function burn(address from, uint256 amount) external",
  "function setAuthorizedBurner(address burner) external",
  "function authorizedBurner() view returns (address)",
  
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event ValidatorUpdated(address indexed oldValidator, address indexed newValidator)",
  "event MintValidated(address indexed user, uint256 amount, uint256 nonce)",
  "event TokensBurned(address indexed from, uint256 amount)",
  "event AuthorizedBurnerUpdated(address indexed oldBurner, address indexed newBurner)"
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
  "function getDynamicAgentPrice(string agentClass) view returns (uint256)",
  "function uriSupply(string tokenURI) view returns (uint256)",
  "function agentClassSupply(string agentClass) view returns (uint256)",
  
  // Lootbox Item Minting
  "function mintLootboxItem(address player, string tokenURI, uint256 basePrice) external returns (uint256)",
  "function items(uint256 tokenId) view returns (uint256 purchasePrice, uint256 mintDate, address originalCreator, uint256 strength)",
  
  // Agent NFT Minting & Queries (ERC-8004)
  "function mintAgent(address player, string agentClass, string tokenURI) external returns (uint256)",
  "function getAgentStats(uint256 tokenId) view returns (tuple(uint256 level, uint256 miningRate, uint256 creationTime, uint256 experience, uint256 strength, string agentClass, uint256 xpGainVariance))",
  
  // Agent Experience & Leveling
  "function addExperience(uint256 tokenId, uint256 baseXpAmount) external",
  
  // Quest System
  "function sendAgentOnQuest(uint256 tokenId, uint256 questDuration) external",
  "function completeQuest(uint256 tokenId) external",
  "function getQuestStatus(uint256 tokenId) view returns (bool isOnQuest, uint256 remainingTime, uint256 questEndTime)",
  "function previewQuestRewards(uint256 tokenId) view returns (uint256 tokens, string rarity, string itemUri, uint256 xpGain)",
  
  // Constants (readable)
  "function PRICE_INCREMENT() view returns (uint256)",
  "function BASE_AGENT_PRICE() view returns (uint256)",
  "function AGENT_PRICE_INCREMENT() view returns (uint256)",
  "function XP_PER_LEVEL() view returns (uint256)",
  "function BASE_WARRIOR_RATE() view returns (uint256)",
  "function BASE_GUARDIAN_RATE() view returns (uint256)",
  "function BASE_SORCERER_RATE() view returns (uint256)",
  
  // Owner Functions
  "function owner() view returns (address)",
  "function withdrawFunds() external",
  "function getAccumulatedFunds() view returns (uint256)",
  
  // Events - Lootbox
  "event LootboxItemMinted(uint256 indexed tokenId, address indexed owner, string itemType, uint256 price, uint256 strength)",
  
  // Events - Agent
  "event AgentCreated(uint256 indexed tokenId, address indexed creator, string agentClass, uint256 miningRate, uint256 xpVariance)",
  "event AgentLeveledUp(uint256 indexed tokenId, uint256 newLevel, uint256 newMiningRate)",
  "event ExperienceGained(uint256 indexed tokenId, uint256 xpAmount, uint256 totalExperience)",
  "event AgentSentOnQuest(uint256 indexed tokenId, address indexed owner, uint256 duration, uint256 endTime)",
  "event AgentReturnedFromQuest(uint256 indexed tokenId, address indexed owner, uint256 xpGained, uint256 tokensEarned, string lootRarity)",
  "event FundsWithdrawn(address indexed owner, uint256 amount, uint256 timestamp)",
  "event TokensBurnt(uint256 amount, string purchaseType)",
  "event OwnerCommission(address indexed owner, uint256 amount, string purchaseType)",
  
  // Standard ERC721 Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
];

export const MarketplaceABI = [
  // Listing Functions
  "function listItem(uint256 tokenId, uint256 price) external",
  "function purchaseItem(uint256 listingId) external",
  "function cancelListing(uint256 listingId) external",
  
  // View Functions
  "function getListing(uint256 listingId) view returns (tuple(address seller, uint256 tokenId, uint256 price, uint256 listedAt, uint8 status))",
  "function getSellerListings(address seller) view returns (uint256[])",
  "function getListingCounter() view returns (uint256)",
  "function isListingActive(uint256 listingId) view returns (bool)",
  
  // Owner Functions
  "function owner() view returns (address)",
  "function withdrawFees() external",
  "function getAccumulatedFees() view returns (uint256)",
  "function PLATFORM_FEE_PERCENTAGE() view returns (uint256)",
  
  // Events
  "event ItemListed(address indexed seller, uint256 indexed tokenId, uint256 price, uint256 indexed listingId, uint256 timestamp)",
  "event ItemPurchased(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price, uint256 listingId, uint256 timestamp)",
  "event ListingCancelled(address indexed seller, uint256 indexed listingId, uint256 tokenId, uint256 timestamp)",
  "event PlatformFeeCollected(uint256 indexed listingId, uint256 fee, uint256 timestamp)",
  "event FeesWithdrawn(address indexed owner, uint256 amount, uint256 timestamp)"
];
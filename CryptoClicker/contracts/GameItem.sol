// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GameItem - Hybrid NFT Contract
 * @dev Supports two distinct NFT types:
 * 
 * 1. LOOTBOX Items: Consumable, tradeable, fixed stats, bonding curve pricing
 *    - Sword of Clicking, Shield of Holding, Scepter of the Infinite
 *    - Fixed strength bonus (1-50, representing 0.01-0.50 multiplier)
 *    - Price increases with supply
 *    - No leveling system
 * 
 * 2. AGENT NFTs: Persistent, progressive, evolving through gameplay (ERC-8004 "Lite")
 *    - Warrior, Guardian, Sorcerer classes
 *    - Level up through experience gains
 *    - Mining rate increases with level
 *    - Randomized XP gain rates per agent
 *    - Soul-bound or freely transferable
 */
contract GameItem is ERC721URIStorage, ERC2981, Ownable {
    
    // ============ ENUMS ============
    enum ItemType { LOOTBOX, AGENT }

    uint256 private _nextTokenId;
    IERC20 public paymentToken;

    // ============ STRUCTS ============
    
    /**
     * @dev Metadata for lootbox items
     */
    struct ItemMetadata {
        uint256 purchasePrice;
        uint256 mintDate;
        address originalCreator;
        uint256 strength; // 1-50 (0.01-0.50 multiplier when divided by 100)
    }

    /**
     * @dev ERC-8004 Agent Stats (Identity Registry)
     * Agents evolve over time and gain XP through gameplay
     */
    struct AgentStats {
        uint256 level;              // Current agent level (starts at 1)
        uint256 miningRate;         // Base passive token generation (scaled by 1e18)
        uint256 creationTime;       // Block timestamp at creation
        uint256 experience;         // Cumulative XP gained
        uint256 strength;           // Base stat (1-50), influences XP gain variance
        string agentClass;          // "Warrior", "Guardian", "Sorcerer"
        uint256 xpGainVariance;     // Randomized XP multiplier (affects leveling speed)
    }

    /**
     * @dev Ownership/transfer history for provenance tracking
     */
    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    // ============ MAPPINGS ============
    
    // NFT Type tracking
    mapping(uint256 => ItemType) public nftTypes;
    
    // Lootbox-specific
    mapping(string => uint256) public uriSupply;                   // Track supply per lootbox URI
    mapping(uint256 => ItemMetadata) public items;                 // Lootbox item metadata
    
    // Agent-specific (ERC-8004 Identity Registry)
    mapping(uint256 => AgentStats) public agentRegistry;          // Complete agent stats
    mapping(uint256 => uint256) public agentMintCounts;           // Track agent supply per class
    
    // Universal
    mapping(uint256 => TransferRecord[]) private _itemHistory;    // Transfer history for all NFTs

    // ============ CONSTANTS ============
    
    // Pricing (Lootbox)
    uint256 public constant PRICE_INCREMENT = 1 * 10**18;         // 1 token per additional unit
    
    // Experience (Agent)
    uint256 public constant XP_PER_LEVEL = 100;                  // Base XP needed per level
    
    // Base mining rates per agent class (tokens/sec, scaled by 1e18)
    uint256 public constant BASE_WARRIOR_RATE = 0.5 * 10**18;    // 0.5 tokens/sec
    uint256 public constant BASE_GUARDIAN_RATE = 1 * 10**18;     // 1 token/sec
    uint256 public constant BASE_SORCERER_RATE = 2 * 10**18;     // 2 tokens/sec
    
    // Agent creation costs (in CLK tokens)
    uint256 public constant AGENT_MINT_COST = 500 * 10**18;      // 500 CLK to create agent

    // ============ EVENTS ============
    
    // Lootbox events
    event LootboxItemMinted(uint256 indexed tokenId, address indexed owner, string itemType, uint256 price, uint256 strength);
    
    // Agent events
    event AgentCreated(uint256 indexed tokenId, address indexed creator, string agentClass, uint256 miningRate, uint256 xpVariance);
    event AgentLeveledUp(uint256 indexed tokenId, uint256 newLevel, uint256 newMiningRate);
    event ExperienceGained(uint256 indexed tokenId, uint256 xpAmount, uint256 totalExperience);

    constructor(address _paymentTokenAddress) ERC721("ClickerItem", "ITM") Ownable(msg.sender) {
        paymentToken = IERC20(_paymentTokenAddress);
        _setDefaultRoyalty(msg.sender, 1000); // 10% royalty
    }

    // ============ LOOTBOX FUNCTIONS ============
    
    /**
     * @dev Calculate dynamic price for lootbox items (bonding curve)
     */
    function getDynamicPrice(string memory tokenURI, uint256 basePrice) public view returns (uint256) {
        uint256 supply = uriSupply[tokenURI];
        return basePrice + (supply * PRICE_INCREMENT);
    }

    /**
     * @dev Mint a lootbox item (consumable, fixed stats)
     */
    function mintLootboxItem(address player, string memory tokenURI, uint256 basePrice)
        external
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Mark as lootbox
        nftTypes[tokenId] = ItemType.LOOTBOX;

        // Calculate and charge dynamic price
        uint256 currentPrice = getDynamicPrice(tokenURI, basePrice);
        require(
            paymentToken.transferFrom(msg.sender, address(this), currentPrice),
            "Payment failed"
        );

        uriSupply[tokenURI]++;

        // Generate random strength between 1 and 50
        uint256 randomStrength = (uint256(keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            tokenId
        ))) % 50) + 1;

        // Store lootbox metadata
        items[tokenId] = ItemMetadata({
            purchasePrice: currentPrice,
            mintDate: block.timestamp,
            originalCreator: msg.sender,
            strength: randomStrength
        });

        // Record mint as first history event
        _itemHistory[tokenId].push(TransferRecord({
            from: address(0),
            to: player,
            timestamp: block.timestamp
        }));

        emit LootboxItemMinted(tokenId, player, tokenURI, currentPrice, randomStrength);

        return tokenId;
    }

    // ============ AGENT FUNCTIONS ============
    
    /**
     * @dev Derive agent class from URI (maps lootbox URIs to agent archetypes)
     */
    function _deriveAgentClass(string memory tokenURI) internal pure returns (string memory) {
        bytes32 uriHash = keccak256(bytes(tokenURI));
        
        if (uriHash == keccak256(bytes("ipfs://valid-uri-1"))) {
            return "Warrior";
        }
        if (uriHash == keccak256(bytes("ipfs://valid-uri-2"))) {
            return "Guardian";
        }
        if (uriHash == keccak256(bytes("ipfs://valid-uri-3"))) {
            return "Sorcerer";
        }
        
        return "Wanderer";
    }

    /**
     * @dev Get base mining rate for agent class
     */
    function _getBaseMiningRate(string memory agentClass) internal pure returns (uint256) {
        bytes32 classHash = keccak256(bytes(agentClass));
        
        if (classHash == keccak256(bytes("Warrior"))) {
            return BASE_WARRIOR_RATE;
        }
        if (classHash == keccak256(bytes("Guardian"))) {
            return BASE_GUARDIAN_RATE;
        }
        if (classHash == keccak256(bytes("Sorcerer"))) {
            return BASE_SORCERER_RATE;
        }
        
        return BASE_WARRIOR_RATE;
    }

    /**
     * @dev Generate XP variance for agent (affects leveling speed)
     * Stronger agents (higher strength) can have higher or lower XP rates
     * Returns a multiplier scaled to 1e18 (1e18 = 1.0x)
     */
    function _generateXpVariance(uint256 tokenId) internal view returns (uint256) {
        // Use token ID and block hash for randomness
        uint256 variance = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            tokenId
        )));
        
        // Scale variance between 0.8x and 1.2x (80% to 120%)
        // Result: 8e17 to 12e17
        return 8e17 + (variance % 4e17);
    }

    /**
     * @dev Create a persistent Agent NFT (ERC-8004 lite)
     * Agents are higher-tier, evolve through gameplay, can have randomized progression
     */
    function mintAgent(
        address player,
        string memory agentClass,
        string memory tokenURI
    )
        external
        returns (uint256)
    {
        require(
            paymentToken.transferFrom(msg.sender, address(this), AGENT_MINT_COST),
            "Insufficient CLK to create agent"
        );

        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Mark as agent
        nftTypes[tokenId] = ItemType.AGENT;

        // Track agent supply per class
        agentMintCounts[_hashClass(agentClass)]++;

        // Generate base stats
        uint256 baseMiningRate = _getBaseMiningRate(agentClass);
        uint256 randomStrength = (uint256(keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            tokenId
        ))) % 50) + 1;
        uint256 xpVariance = _generateXpVariance(tokenId);

        // Initialize agent in registry
        agentRegistry[tokenId] = AgentStats({
            level: 1,
            miningRate: baseMiningRate,
            creationTime: block.timestamp,
            experience: 0,
            strength: randomStrength,
            agentClass: agentClass,
            xpGainVariance: xpVariance
        });

        // Record creation as first history event
        _itemHistory[tokenId].push(TransferRecord({
            from: address(0),
            to: player,
            timestamp: block.timestamp
        }));

        emit AgentCreated(tokenId, msg.sender, agentClass, baseMiningRate, xpVariance);

        return tokenId;
    }

    /**
     * @dev Add experience to an agent
     * XP gain is affected by agent's xpGainVariance (randomized progression)
     */
    function addExperience(uint256 tokenId, uint256 baseXpAmount) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "Only agents gain experience");

        AgentStats storage agent = agentRegistry[tokenId];
        
        // Apply XP variance to base amount
        uint256 actualXp = (baseXpAmount * agent.xpGainVariance) / 1e18;
        agent.experience += actualXp;

        emit ExperienceGained(tokenId, actualXp, agent.experience);

        // Check for level up
        uint256 newLevel = (agent.experience / XP_PER_LEVEL) + 1;
        if (newLevel > agent.level) {
            agent.level = newLevel;
            // Increase mining rate by 10% per level
            agent.miningRate = (agent.miningRate * 110) / 100;
            
            emit AgentLeveledUp(tokenId, newLevel, agent.miningRate);
        }
    }

    /**
     * @dev Admin function to set agent experience directly (for testing/events)
     */
    function setExperience(uint256 tokenId, uint256 xpAmount) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "Only agents have experience");

        AgentStats storage agent = agentRegistry[tokenId];
        agent.experience = xpAmount;

        // Recalculate level
        uint256 newLevel = (xpAmount / XP_PER_LEVEL) + 1;
        agent.level = newLevel;

        emit ExperienceGained(tokenId, xpAmount, xpAmount);
    }

    // ============ QUERY FUNCTIONS ============
    
    /**
     * @dev Get NFT type
     */
    function getNftType(uint256 tokenId) external view returns (ItemType) {
        require(_exists(tokenId), "Token does not exist");
        return nftTypes[tokenId];
    }

    /**
     * @dev Get complete agent stats
     */
    function getAgentStats(uint256 tokenId) external view returns (AgentStats memory) {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "This is not an agent");
        return agentRegistry[tokenId];
    }

    /**
     * @dev Get agent level
     */
    function getAgentLevel(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "This is not an agent");
        return agentRegistry[tokenId].level;
    }

    /**
     * @dev Get agent mining rate
     */
    function getAgentMiningRate(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "This is not an agent");
        return agentRegistry[tokenId].miningRate;
    }

    /**
     * @dev Get agent class
     */
    function getAgentClass(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "This is not an agent");
        return agentRegistry[tokenId].agentClass;
    }

    /**
     * @dev Get agent XP progression
     */
    function getAgentExperience(uint256 tokenId) 
        external 
        view 
        returns (uint256 currentXp, uint256 xpToNextLevel)
    {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "This is not an agent");
        
        AgentStats storage agent = agentRegistry[tokenId];
        currentXp = agent.experience;
        xpToNextLevel = ((agent.level) * XP_PER_LEVEL) - agent.experience;
    }

    /**
     * @dev Get agent XP variance (leveling speed multiplier)
     */
    function getAgentXpVariance(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "This is not an agent");
        return agentRegistry[tokenId].xpGainVariance;
    }

    /**
     * @dev Get lootbox item metadata
     */
    function getItemMetadata(uint256 tokenId) 
        external 
        view 
        returns (ItemMetadata memory)
    {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.LOOTBOX, "This is not a lootbox item");
        return items[tokenId];
    }

    // ============ HISTORY & PROVENANCE ============
    
    /**
     * @dev Override transfer to record history
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override 
        returns (address) 
    {
        address from = super._update(to, tokenId, auth);
        
        if (from != address(0) && to != address(0)) {
            _itemHistory[tokenId].push(TransferRecord({
                from: from,
                to: to,
                timestamp: block.timestamp
            }));
        }
        return from;
    }

    /**
     * @dev Get complete transfer history for an NFT
     */
    function getItemHistory(uint256 tokenId) 
        external 
        view 
        returns (TransferRecord[] memory)
    {
        return _itemHistory[tokenId];
    }

    // ============ UTILITIES ============
    
    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Hash agent class for lookup
     */
    function _hashClass(string memory agentClass) internal pure returns (uint256) {
        return uint256(keccak256(bytes(agentClass)));
    }

    /**
     * @dev Get agent supply for a class
     */
    function getAgentSupplyByClass(string memory agentClass) 
        external 
        view 
        returns (uint256) 
    {
        return agentMintCounts[_hashClass(agentClass)];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
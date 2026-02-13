// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/QuestLootLib.sol";
import "./libraries/PricingLib.sol";
import "./libraries/AgentMathLib.sol";

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
        uint256 level;              
        uint256 miningRate;         
        uint256 creationTime;       
        uint256 experience;         
        uint256 strength;           
        string agentClass;          
        uint256 xpGainVariance;     
    }

    /**
     * @dev Quest/Staking information for agents
     */
    struct QuestInfo {
        address staker;
        uint256 startTime;
        uint256 questDuration;
        bool isOnQuest;
        bytes32 randomSeed;
    }
    
    mapping(uint256 => ItemType) public nftTypes;
    mapping(string => uint256) public uriSupply;
    mapping(uint256 => ItemMetadata) public items;
    mapping(uint256 => AgentStats) public agentRegistry;
    mapping(uint256 => QuestInfo) public agentQuests;   

    // Pricing (Lootbox)
    uint256 public constant PRICE_INCREMENT = 1 * 10**18;         
    
    uint256 public constant XP_PER_LEVEL = 100;                 
    
    uint256 public constant BASE_WARRIOR_RATE = 0.5 * 10**18;    
    uint256 public constant BASE_GUARDIAN_RATE = 1 * 10**18;     
    uint256 public constant BASE_SORCERER_RATE = 2 * 10**18;     
    
    uint256 public constant AGENT_MINT_COST = 500 * 10**18;      

    
    // Agent events
    event AgentCreated(uint256 indexed tokenId, address indexed creator, string agentClass, uint256 miningRate, uint256 xpVariance);
    event AgentLeveledUp(uint256 indexed tokenId, uint256 newLevel, uint256 newMiningRate);
    event ExperienceGained(uint256 indexed tokenId, uint256 xpAmount, uint256 totalExperience);
    
    // Quest events
    event AgentSentOnQuest(uint256 indexed tokenId, address indexed owner, uint256 duration, uint256 endTime);
    event AgentReturnedFromQuest(uint256 indexed tokenId, address indexed owner, uint256 xpGained, uint256 tokensEarned, string lootRarity);

    constructor(address _paymentTokenAddress) ERC721("ClickerItem", "ITM") Ownable(msg.sender) {
        paymentToken = IERC20(_paymentTokenAddress);
        _setDefaultRoyalty(msg.sender, 1000); // 10% royalty
    }

    
    
    function getDynamicPrice(string memory tokenURI, uint256 basePrice) public view returns (uint256) {
        // Price based on supply of THIS specific item type
        uint256 supply = uriSupply[tokenURI];
        return PricingLib.dynamicPrice(basePrice, supply, PRICE_INCREMENT);
    }

    function mintLootboxItem(address player, string memory tokenURI, uint256 basePrice)
        external
        returns (uint256)
    {
        // Calculate price BEFORE incrementing tokenId (to match frontend calculation)
        uint256 currentPrice = getDynamicPrice(tokenURI, basePrice);
        require(
            paymentToken.transferFrom(msg.sender, address(this), currentPrice),
            "E1"
        );

        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Mark as lootbox
        nftTypes[tokenId] = ItemType.LOOTBOX;

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

        return tokenId;
    }





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
            "E2"
        );

        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Mark as agent
        nftTypes[tokenId] = ItemType.AGENT;

        // Generate base stats
        uint256 baseMiningRate = AgentMathLib.baseMiningRate(
            agentClass,
            BASE_WARRIOR_RATE,
            BASE_GUARDIAN_RATE,
            BASE_SORCERER_RATE
        );
        uint256 randomStrength = (uint256(keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            tokenId
        ))) % 50) + 1;
        uint256 xpVariance = AgentMathLib.generateXpVariance(tokenId);

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

        emit AgentCreated(tokenId, msg.sender, agentClass, baseMiningRate, xpVariance);

        return tokenId;
    }

    function addExperience(uint256 tokenId, uint256 baseXpAmount) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(nftTypes[tokenId] == ItemType.AGENT, "Only agents gain experience");

        AgentStats storage agent = agentRegistry[tokenId];
        
        // Apply XP variance to base amount
        uint256 actualXp = (baseXpAmount * agent.xpGainVariance) / 1e18;
        agent.experience += actualXp;

        emit ExperienceGained(tokenId, actualXp, agent.experience);

        _checkLevelUp(tokenId);
    }

    function _checkLevelUp(uint256 tokenId) internal {
        AgentStats storage agent = agentRegistry[tokenId];
        uint256 newLevel = (agent.experience / XP_PER_LEVEL) + 1;
        
        if (newLevel > agent.level) {
            agent.level = newLevel;
            // Increase mining rate by 10% per level
            agent.miningRate = (agent.miningRate * 110) / 100;
            
            emit AgentLeveledUp(tokenId, newLevel, agent.miningRate);
        }
    }



    function getNftType(uint256 tokenId) external view returns (ItemType) {
        return nftTypes[tokenId];
    }

    function getAgentStats(uint256 tokenId) external view returns (AgentStats memory) {
        return agentRegistry[tokenId];
    }



    function _update(address to, uint256 tokenId, address auth) 
        internal 
        virtual 
        override 
        returns (address) 
    {
        return super._update(to, tokenId, auth);
    }



 
    function _exists(uint256 tokenId) internal view returns (bool) {
        return ownerOf(tokenId) != address(0);
    }

    function sendAgentOnQuest(uint256 tokenId, uint256 questDuration) external {
        require(ownerOf(tokenId) == msg.sender, "E3");
        require(!agentQuests[tokenId].isOnQuest, "E4");
        require(questDuration >= 60, "E5");
        
        // Capture random seed using previous block hash (immutable after this block)
        bytes32 seed = blockhash(block.number - 1);
        
        agentQuests[tokenId] = QuestInfo({
            staker: msg.sender,
            startTime: block.timestamp,
            questDuration: questDuration,
            isOnQuest: true,
            randomSeed: seed
        });
        
        emit AgentSentOnQuest(tokenId, msg.sender, questDuration, block.timestamp + questDuration);
    }

    function completeQuest(uint256 tokenId) external {
        QuestInfo storage quest = agentQuests[tokenId];
        require(quest.isOnQuest, "E6");
        require(quest.staker == msg.sender, "E7");
        require(block.timestamp >= quest.startTime + quest.questDuration, "E8");
        
        // Calculate rewards based on duration and agent stats
        AgentStats storage agent = agentRegistry[tokenId];
        
        uint256 baseXp = quest.questDuration / 36; // ~10 XP per hour
        uint256 xpGained = (baseXp * agent.xpGainVariance) / 1e18;
        
        // Determine loot using stored deterministic seed
        (uint256 tokens, string memory rarity, string memory itemUri) = QuestLootLib.rollQuestLoot(
            quest.randomSeed,
            tokenId,
            agent.strength,
            quest.questDuration
        );
        
        // Award XP
        agent.experience += xpGained;
        _checkLevelUp(tokenId);
        
        // Mint tokens
        require(paymentToken.transfer(msg.sender, tokens), "E9");
        
        // Mint loot item if earned
        if (bytes(itemUri).length > 0) {
            _mintQuestLoot(msg.sender, itemUri);
        }
        
        // Clear quest
        quest.isOnQuest = false;
        
        emit AgentReturnedFromQuest(tokenId, msg.sender, xpGained, tokens, rarity);
    }

    function previewQuestRewards(uint256 tokenId) external view returns (
    uint256 tokens,
    string memory rarity,
    string memory itemUri,
    uint256 xpGain
    ) {
        QuestInfo memory quest = agentQuests[tokenId];
        require(quest.isOnQuest, "Not on quest");
        
        AgentStats memory agent = agentRegistry[tokenId];
        uint256 baseXp = quest.questDuration / 36;
        xpGain = (baseXp * agent.xpGainVariance) / 1e18;
        
        (tokens, rarity, itemUri) = QuestLootLib.rollQuestLoot(
            quest.randomSeed,
            tokenId,
            agent.strength,
            quest.questDuration
        );
    }

    function _mintQuestLoot(address recipient, string memory uri) internal {
        uint256 tokenId = _nextTokenId++;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, uri);
        nftTypes[tokenId] = ItemType.LOOTBOX;
        
        // Generate random strength
        uint256 randomStrength = (uint256(keccak256(abi.encodePacked(
            block.timestamp,
            tokenId
        ))) % 50) + 1;
        
        items[tokenId] = ItemMetadata({
            purchasePrice: 0,
            mintDate: block.timestamp,
            originalCreator: recipient,
            strength: randomStrength
        });
    }
    function getQuestStatus(uint256 tokenId) external view returns (
        bool isOnQuest,
        uint256 remainingTime,
        uint256 questEndTime
    ) {
        QuestInfo memory quest = agentQuests[tokenId];
        isOnQuest = quest.isOnQuest;
        questEndTime = quest.startTime + quest.questDuration;
        remainingTime = questEndTime > block.timestamp ? questEndTime - block.timestamp : 0;
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
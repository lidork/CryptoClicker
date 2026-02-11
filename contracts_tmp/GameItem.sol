// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GameItem is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;
    IERC20 public clickerToken;

    struct ItemMetadata {
        uint256 purchasePrice;
        uint256 mintDate;
        address originalCreator;
        string rarity;
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    mapping(uint256 => ItemMetadata) public items;
    mapping(uint256 => TransferRecord[]) private _itemHistory;

    // Lootbox config
    uint256 public constant CHEAP_BOX_PRICE = 10 * 10**18;
    uint256 public constant EXPENSIVE_BOX_PRICE = 50 * 10**18;
    
    string[] public commonURIs;
    string[] public rareURIs;

    event LootBoxOpened(address indexed player, uint256 tokenId, string rarity);

    constructor(address _clickerTokenAddress) ERC721("ClickerItem", "ITM") Ownable(msg.sender) {
        clickerToken = IERC20(_clickerTokenAddress);
        // Set default royalty to 10% (1000 basis points)
        _setDefaultRoyalty(msg.sender, 1000);
    }

    function addCommonURI(string memory uri) public onlyOwner {
        commonURIs.push(uri);
    }
    
    function addRareURI(string memory uri) public onlyOwner {
        rareURIs.push(uri);
    }

    function openLootBox(bool isExpensive) public {
        uint256 price = isExpensive ? EXPENSIVE_BOX_PRICE : CHEAP_BOX_PRICE;
        
        // Transfer 'price' from the user to this contract (or owner)
        // Note: User must approve this contract to spend their tokens first!
        require(clickerToken.transferFrom(msg.sender, address(this), price), "Payment failed");

        // Simple Randomness 
        // 0-99
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, _nextTokenId))) % 100;
        
        // Thresholds: 
        // Cheap Box (5% rare): Need 95-99.
        // Expensive Box (10% rare): Need 90-99.
        uint256 threshold = isExpensive ? 90 : 95;
        
        string memory selectedURI;
        string memory rarity;
        
        if (rand >= threshold && rareURIs.length > 0) {
            // RARE
            // Pick a random rare URI
            uint256 index = uint256(keccak256(abi.encodePacked(rand, "rare"))) % rareURIs.length;
            selectedURI = rareURIs[index];
            rarity = "Rare";
        } else {
            // COMMON
            require(commonURIs.length > 0, "No common items defined in contract");
            uint256 index = uint256(keccak256(abi.encodePacked(rand, "common"))) % commonURIs.length;
            selectedURI = commonURIs[index];
            rarity = "Common";
        }
        
        uint256 tokenId = _mintItemWithRarity(msg.sender, selectedURI, rarity, price);
        emit LootBoxOpened(msg.sender, tokenId, rarity);
    }

    // Helper for minting
    function _mintItemWithRarity(address player, string memory tokenURI, string memory rarity, uint256 price) internal returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        items[tokenId] = ItemMetadata({
            purchasePrice: price,
            mintDate: block.timestamp,
            originalCreator: player, // The person who opened the box is the "creator" effectively, or use msg.sender
            rarity: rarity
        });

        // Record the mint as the first history event
        _itemHistory[tokenId].push(TransferRecord({
            from: address(0),
            to: player,
            timestamp: block.timestamp
        }));

        return tokenId;
    }

    function mintItem(address player, string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        return _mintItemWithRarity(player, tokenURI, "Admin", 0);
    }

    // Override transfer to record history
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
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

    function getItemHistory(uint256 tokenId) public view returns (TransferRecord[] memory) {
        return _itemHistory[tokenId];
    }

    // Required override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
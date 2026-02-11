// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GameItem is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;

    IERC20 public paymentToken;

    struct ItemMetadata {
        uint256 purchasePrice;
        uint256 mintDate;
        address originalCreator;
        uint256 strength; // randomly attributed strength for game mechanics and rarity
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    mapping(uint256 => ItemMetadata) public items;
    mapping(uint256 => TransferRecord[]) private _itemHistory;

    constructor(address _paymentTokenAddress) ERC721("ClickerItem", "ITM") Ownable(msg.sender) {

        paymentToken = IERC20(_paymentTokenAddress);
        _setDefaultRoyalty(msg.sender, 1000); // 10% royalty
    }

    function mintItem(address player, string memory tokenURI, uint256 price)
        public
        returns (uint256)
    {
        require(paymentToken.transferFrom(msg.sender, address(this), price), "Payment failed");

        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);


        //generate random strength between 1 and 50 using block timestamp, sender, and tokenId for some variability
        //will be divided by 100 in the frontend to get a 0.01 to 0.50 multiplier for game mechanics  
        uint256 randomStrength = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, tokenId))) % 50) + 1;


        items[tokenId] = ItemMetadata({
            purchasePrice: price,
            mintDate: block.timestamp,
            originalCreator: msg.sender,
            strength: randomStrength
        });

        // Record the mint as the first history event
        _itemHistory[tokenId].push(TransferRecord({
            from: address(0),
            to: player,
            timestamp: block.timestamp
        }));

        return tokenId;
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
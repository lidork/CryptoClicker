// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract GameItem is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;

    struct ItemMetadata {
        uint256 purchasePrice;
        uint256 mintDate;
        address originalCreator;
    }

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    mapping(uint256 => ItemMetadata) public items;
    mapping(uint256 => TransferRecord[]) private _itemHistory;

    constructor() ERC721("ClickerItem", "ITM") Ownable(msg.sender) {
        // Set default royalty to 10% (1000 basis points)
        _setDefaultRoyalty(msg.sender, 1000);
    }

    function mintItem(address player, string memory tokenURI)
        public
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        items[tokenId] = ItemMetadata({
            purchasePrice: 0,
            mintDate: block.timestamp,
            originalCreator: msg.sender
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
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace - Secondary Market for GameItem NFTs
 * @dev Allows users to list GameItem NFTs for sale in CLK tokens
 * Uses escrow model: NFTs are held by the marketplace during listing
 */
contract Marketplace is Ownable, ReentrancyGuard {
    
    // ============ TYPES ============
    enum ListingStatus { ACTIVE, SOLD, CANCELLED }
    
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price; // in wei of CLK tokens
        uint256 listedAt;
        ListingStatus status;
    }

    // ============ STATE ============
    IERC721 public gameItemNFT;
    IERC20 public paymentToken;
    
    uint256 private listingCounter;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256[]) public userListings; // seller -> listing IDs
    
    // ============ EVENTS ============
    event ItemListed(
        address indexed seller,
        uint256 indexed tokenId,
        uint256 price,
        uint256 indexed listingId,
        uint256 timestamp
    );
    
    event ItemPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId,
        uint256 timestamp
    );
    
    event ListingCancelled(
        address indexed seller,
        uint256 indexed listingId,
        uint256 tokenId,
        uint256 timestamp
    );

    // ============ CONSTRUCTOR ============
    constructor(address gameItem, address paymentTokenAddress) Ownable(msg.sender) {
        require(gameItem != address(0), "Invalid GameItem address");
        require(paymentTokenAddress != address(0), "Invalid payment token address");
        gameItemNFT = IERC721(gameItem);
        paymentToken = IERC20(paymentTokenAddress);
        listingCounter = 1;
    }

    // ============ LISTING FUNCTIONS ============
    
    /**
     * @dev Lists an NFT for sale. Requires user to approve NFT transfer first.
     * @param tokenId The ID of the NFT to list
     * @param price The price in CLK tokens (wei)
     */
    function listItem(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(gameItemNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        
        // Transfer NFT to contract for escrow
        gameItemNFT.transferFrom(msg.sender, address(this), tokenId);
        
        uint256 listingId = listingCounter;
        listings[listingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            listedAt: block.timestamp,
            status: ListingStatus.ACTIVE
        });
        
        userListings[msg.sender].push(listingId);
        listingCounter++;
        
        emit ItemListed(msg.sender, tokenId, price, listingId, block.timestamp);
    }

    /**
     * @dev Purchases a listed NFT. Requires approval of CLK tokens first.
     * @param listingId The ID of the listing to purchase
     */
    function purchaseItem(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy own listing");
        
        // Check buyer has sufficient balance
        require(
            paymentToken.balanceOf(msg.sender) >= listing.price,
            "Insufficient CLK balance"
        );
        
        // Check marketplace has approval to transfer tokens
        require(
            paymentToken.allowance(msg.sender, address(this)) >= listing.price,
            "Insufficient token allowance"
        );
        
        // Transfer payment to seller
        require(
            paymentToken.transferFrom(msg.sender, listing.seller, listing.price),
            "Payment transfer failed"
        );
        
        // Transfer NFT to buyer
        gameItemNFT.transferFrom(address(this), msg.sender, listing.tokenId);
        
        // Mark listing as sold
        listing.status = ListingStatus.SOLD;
        
        emit ItemPurchased(msg.sender, listing.seller, listing.tokenId, listing.price, listingId, block.timestamp);
    }

    /**
     * @dev Cancels a listing and returns the NFT to the seller
     * @param listingId The ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.seller == msg.sender, "Only seller can cancel");
        
        // Return NFT to seller
        gameItemNFT.transferFrom(address(this), msg.sender, listing.tokenId);
        
        // Mark as cancelled
        listing.status = ListingStatus.CANCELLED;
        
        emit ListingCancelled(msg.sender, listingId, listing.tokenId, block.timestamp);
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Gets a specific listing
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @dev Gets all active listings for a seller
     */
    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return userListings[seller];
    }

    /**
     * @dev Gets the current listing counter (for frontend pagination/iteration)
     */
    function getListingCounter() external view returns (uint256) {
        return listingCounter;
    }

    /**
     * @dev Checks if a listing is active
     */
    function isListingActive(uint256 listingId) external view returns (bool) {
        return listings[listingId].status == ListingStatus.ACTIVE;
    }
}

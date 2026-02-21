// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGameItemHistory {
    function prepareMarketplaceTransfer(uint256 tokenId) external;
    function recordMarketplaceTransfer(uint256 tokenId, address seller, address buyer, uint256 price) external;
}

/**
 * Marketplace - Secondary Market for GameItem NFTs
 * Allows users to list GameItem NFTs for sale in CLK tokens
 * Uses escrow model: NFTs are held by the marketplace during listing
 */
contract Marketplace is Ownable, ReentrancyGuard {
    
    enum ListingStatus { ACTIVE, SOLD, CANCELLED }
    
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price; // in wei of CLK tokens
        uint256 listedAt;
        ListingStatus status;
    }

    IERC721 public gameItemNFT;
    IERC20 public paymentToken;
    
    uint256 private listingCounter;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256[]) public userListings; // seller -> listing IDs
    
    // Platform fee: 10% on all transactions
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 10;
    uint256 public accumulatedFees; // Total fees collected by platform
    
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
    
    event PlatformFeeCollected(
        uint256 indexed listingId,
        uint256 fee,
        uint256 timestamp
    );

    event RoyaltyPaid(
        uint256 indexed listingId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event FeesWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address gameItem, address paymentTokenAddress) Ownable(msg.sender) {
        require(gameItem != address(0), "Invalid GameItem address");
        require(paymentTokenAddress != address(0), "Invalid payment token address");
        gameItemNFT = IERC721(gameItem);
        paymentToken = IERC20(paymentTokenAddress);
        listingCounter = 1;
    }

    // Withdraws accumulated platform fees to the owner
    
    // Lists an NFT for sale. Requires user to approve NFT transfer first.
    
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

   
     // Purchases a listed NFT. Requires approval of CLK tokens first.
    
    function purchaseItem(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy own listing");

        (address royaltyRecipient, uint256 royaltyAmount) = _getRoyaltyInfo(listing.tokenId, listing.price);
        require(royaltyAmount <= listing.price, "Invalid royalty amount");
        uint256 sellerProceeds = listing.price - royaltyAmount;
        
        // Calculate platform fee (10% of listing price)
        uint256 platformFee = (listing.price * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 totalCost = listing.price + platformFee;
        
        // Check buyer has sufficient balance for price + fee
        require(
            paymentToken.balanceOf(msg.sender) >= totalCost,
            "Insufficient CLK balance"
        );
        
        // Check marketplace has approval to transfer tokens
        require(
            paymentToken.allowance(msg.sender, address(this)) >= totalCost,
            "Insufficient token allowance"
        );
        
        if (sellerProceeds > 0) {
            require(
                paymentToken.transferFrom(msg.sender, listing.seller, sellerProceeds),
                "Seller payment failed"
            );
        }

        if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
            require(
                paymentToken.transferFrom(msg.sender, royaltyRecipient, royaltyAmount),
                "Royalty payment failed"
            );
        }
        
        // Transfer platform fee to contract
        require(
            paymentToken.transferFrom(msg.sender, address(this), platformFee),
            "Fee transfer failed"
        );
        
        // Accumulate fees for owner withdrawal
        accumulatedFees += platformFee;
        
        // Suppress default transfer history so we can record price
        IGameItemHistory(address(gameItemNFT)).prepareMarketplaceTransfer(listing.tokenId);

        // Transfer NFT to buyer
        gameItemNFT.transferFrom(address(this), msg.sender, listing.tokenId);

        // Record marketplace transfer history on-chain
        IGameItemHistory(address(gameItemNFT)).recordMarketplaceTransfer(
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price
        );
        
        // Mark listing as sold
        listing.status = ListingStatus.SOLD;
        
        emit ItemPurchased(msg.sender, listing.seller, listing.tokenId, listing.price, listingId, block.timestamp);
        if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
            emit RoyaltyPaid(listingId, royaltyRecipient, royaltyAmount, block.timestamp);
        }
        emit PlatformFeeCollected(listingId, platformFee, block.timestamp);
    }

    function _getRoyaltyInfo(uint256 tokenId, uint256 salePrice) internal view returns (address, uint256) {
        if (!gameItemNFT.supportsInterface(type(IERC2981).interfaceId)) {
            return (address(0), 0);
        }

        try IERC2981(address(gameItemNFT)).royaltyInfo(tokenId, salePrice) returns (address receiver, uint256 royaltyAmount) {
            return (receiver, royaltyAmount);
        } catch {
            return (address(0), 0);
        }
    }

     //Cancels a listing and returns the NFT to the seller
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

    
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }


    function getSellerListings(address seller) external view returns (uint256[] memory) {
        return userListings[seller];
    }


    function getListingCounter() external view returns (uint256) {
        return listingCounter;
    }


    function isListingActive(uint256 listingId) external view returns (bool) {
        return listings[listingId].status == ListingStatus.ACTIVE;
    }
    
    
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        
        require(
            paymentToken.transfer(owner(), amount),
            "Fee withdrawal failed"
        );
        
        emit FeesWithdrawn(owner(), amount, block.timestamp);
    }
    
    function getAccumulatedFees() external view returns (uint256) {
        return accumulatedFees;
    }
}

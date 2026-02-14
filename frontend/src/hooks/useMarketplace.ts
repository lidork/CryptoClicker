import { useState, useCallback } from 'react'
import { Contract, formatEther, parseEther } from 'ethers'
import { toast } from 'react-toastify'
import { ClickerTokenABI, GameItemABI } from '../abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, MARKETPLACE_ADDRESS, GAME_ITEM_ADDRESS } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { MarketplaceListing, InventoryItem } from '../types'

// Define Marketplace ABI inline (will be added to contractABIs.ts)
const MarketplaceABI = [
  "function listItem(uint256 tokenId, uint256 price) external",
  "function purchaseItem(uint256 listingId) external",
  "function cancelListing(uint256 listingId) external",
  "function getListing(uint256 listingId) external view returns (tuple(address seller, uint256 tokenId, uint256 price, uint256 listedAt, uint8 status))",
  "function getSellerListings(address seller) external view returns (uint256[])",
  "function getListingCounter() external view returns (uint256)",
  "function isListingActive(uint256 listingId) external view returns (bool)",
  "event ItemListed(address indexed seller, uint256 indexed tokenId, uint256 price, uint256 indexed listingId, uint256 timestamp)",
  "event ItemPurchased(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price, uint256 listingId, uint256 timestamp)",
  "event ListingCancelled(address indexed seller, uint256 indexed listingId, uint256 tokenId, uint256 timestamp)"
];

interface RawListing {
  seller: string;
  tokenId: bigint;
  price: bigint;
  listedAt: bigint;
  status: number;
}

export function useMarketplace(
  signer: JsonRpcSigner | null,
  userAddress: string | null
) {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [userListings, setUserListings] = useState<MarketplaceListing[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchAllListings = useCallback(async () => {
    if (!signer) return
    
    try {
      setIsLoading(true)
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const counter = await marketplaceContract.getListingCounter()
      
      const fetchedListings: MarketplaceListing[] = []
      
      // Iterate through all listing IDs
      for (let i = 1; i < Number(counter); i++) {
        try {
          const listing = await marketplaceContract.getListing(i) as RawListing
          const isActive = await marketplaceContract.isListingActive(i)
          
          if (isActive) {
            // Fetch item details from blockchain
            const tokenId = listing.tokenId.toString()
            const nftType = await gameItemContract.getNftType(tokenId)
            
            let itemDetails: InventoryItem
            
            if (Number(nftType) === 1) { // AGENT
              const stats = await gameItemContract.getAgentStats(tokenId)
              // Destructure tuple: [level, miningRate, creationTime, experience, strength, agentClass, xpGainVariance]
              const [level, miningRate, , experience, strength, agentClass, xpGainVariance] = stats
              itemDetails = {
                id: tokenId,
                uri: '',
                strength: Number(strength),
                isAgent: true,
                agentClass: agentClass,
                level: Number(level),
                miningRate: Number(miningRate),
                experience: Number(experience),
                xpGainVariance: Number(xpGainVariance)
              }
            } else { // LOOTBOX
              const itemData = await gameItemContract.items(tokenId)
              const uri = await gameItemContract.tokenURI(tokenId)
              itemDetails = {
                id: tokenId,
                uri: uri,
                strength: Number(itemData.strength),
                isAgent: false
              }
            }
            
            fetchedListings.push({
              id: i.toString(),
              seller: listing.seller,
              tokenId: tokenId,
              price: formatEther(listing.price),
              listedAt: Number(listing.listedAt),
              itemDetails
            })
          }
        } catch (e) {
          // Skip listings that error out
          console.warn(`Error fetching listing ${i}:`, e)
        }
      }
      
      setListings(fetchedListings)
    } catch (e) {
      console.warn("Error fetching listings", e)
      toast.error("Failed to fetch marketplace listings")
    } finally {
      setIsLoading(false)
    }
  }, [signer])

  const fetchUserListings = useCallback(async () => {
    if (!signer || !userAddress) return
    
    try {
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const listingIds = await marketplaceContract.getSellerListings(userAddress)
      
      const fetchedListings: MarketplaceListing[] = []
      
      for (const listingId of listingIds) {
        try {
          const listing = await marketplaceContract.getListing(listingId) as RawListing
          const isActive = await marketplaceContract.isListingActive(listingId)
          
          if (isActive) {
            // Fetch item details from blockchain
            const tokenId = listing.tokenId.toString()
            const nftType = await gameItemContract.getNftType(tokenId)
            
            let itemDetails: InventoryItem
            
            if (Number(nftType) === 1) { // AGENT
              const stats = await gameItemContract.getAgentStats(tokenId)
              // Destructure tuple: [level, miningRate, creationTime, experience, strength, agentClass, xpGainVariance]
              const [level, miningRate, , experience, strength, agentClass, xpGainVariance] = stats
              itemDetails = {
                id: tokenId,
                uri: '',
                strength: Number(strength),
                isAgent: true,
                agentClass: agentClass,
                level: Number(level),
                miningRate: Number(miningRate),
                experience: Number(experience),
                xpGainVariance: Number(xpGainVariance)
              }
            } else { // LOOTBOX
              const itemData = await gameItemContract.items(tokenId)
              const uri = await gameItemContract.tokenURI(tokenId)
              itemDetails = {
                id: tokenId,
                uri: uri,
                strength: Number(itemData.strength),
                isAgent: false
              }
            }
            
            fetchedListings.push({
              id: listingId.toString(),
              seller: listing.seller,
              tokenId: tokenId,
              price: formatEther(listing.price),
              listedAt: Number(listing.listedAt),
              itemDetails
            })
          }
        } catch (e) {
          console.warn(`Error fetching user listing ${listingId}:`, e)
        }
      }
      
      setUserListings(fetchedListings)
    } catch (e) {
      console.warn("Error fetching user listings", e)
    }
  }, [signer, userAddress])

  const listItem = useCallback(async (
    tokenId: string,
    priceInCLK: string,
    gameItemAddress: string,
    abi: unknown[],
    onSuccess: () => Promise<void>
  ) => {
    if (!signer || !userAddress) {
      toast.error("Connect wallet first!")
      return
    }

    const priceWei = parseEther(priceInCLK)

    try {
      // First, approve marketplace to take the NFT
      const gameItemContract = new Contract(gameItemAddress, abi as string[], signer)
      const isApproved = await gameItemContract.isApprovedForAll(userAddress, MARKETPLACE_ADDRESS)

      if (!isApproved) {
        toast.info("Please approve the marketplace to manage your NFTs...")
        const txApprove = await gameItemContract.setApprovalForAll(MARKETPLACE_ADDRESS, true)
        await toast.promise(
          txApprove.wait(),
          { pending: "Approving marketplace...", success: "Approved!", error: "Approval failed" }
        )
      }

      // Then list the item
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)

      const txPromise = async () => {
        const tx = await marketplaceContract.listItem(tokenId, priceWei)
        console.log("List transaction:", tx.hash)
        const receipt = await tx.wait()
        if (receipt) {
          await onSuccess()
        }
        return receipt
      }

      await toast.promise(
        txPromise(),
        { pending: "Listing item...", success: "Item listed successfully!", error: "Listing failed" }
      )
    } catch (e) {
      console.error("Error listing item:", e)
      toast.error("Failed to list item")
    }
  }, [signer, userAddress])

  const purchaseItem = useCallback(async (
    listingId: string,
    priceInCLK: string,
    onSuccess: () => Promise<void>
  ) => {
    if (!signer || !userAddress) {
      toast.error("Connect wallet first!")
      return
    }

    const priceWei = parseEther(priceInCLK)

    try {
      // First, approve marketplace to transfer CLK tokens
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const allowance = await tokenContract.allowance(userAddress, MARKETPLACE_ADDRESS)

      if (allowance < priceWei) {
        toast.info("Please approve the marketplace to spend CLK tokens...")
        const txApprove = await tokenContract.approve(MARKETPLACE_ADDRESS, priceWei)
        await toast.promise(
          txApprove.wait(),
          { pending: "Approving CLK transfer...", success: "Approved!", error: "Approval failed" }
        )
      }

      // Then purchase the item
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)

      const txPromise = async () => {
        const tx = await marketplaceContract.purchaseItem(listingId)
        console.log("Purchase transaction:", tx.hash)
        const receipt = await tx.wait()
        if (receipt) {
          await onSuccess()
        }
        return receipt
      }

      await toast.promise(
        txPromise(),
        { pending: "Purchasing item...", success: "Item purchased successfully!", error: "Purchase failed" }
      )
    } catch (e) {
      console.error("Error purchasing item:", e)
      toast.error("Failed to purchase item")
    }
  }, [signer, userAddress])

  const cancelListing = useCallback(async (
    listingId: string,
    onSuccess: () => Promise<void>
  ) => {
    if (!signer || !userAddress) {
      toast.error("Connect wallet first!")
      return
    }

    try {
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)

      const txPromise = async () => {
        const tx = await marketplaceContract.cancelListing(listingId)
        console.log("Cancel transaction:", tx.hash)
        const receipt = await tx.wait()
        if (receipt) {
          await onSuccess()
        }
        return receipt
      }

      await toast.promise(
        txPromise(),
        { pending: "Cancelling listing...", success: "Listing cancelled!", error: "Cancellation failed" }
      )
    } catch (e) {
      console.error("Error cancelling listing:", e)
      toast.error("Failed to cancel listing")
    }
  }, [signer, userAddress])

  return {
    listings,
    userListings,
    isLoading,
    fetchAllListings,
    fetchUserListings,
    listItem,
    purchaseItem,
    cancelListing
  }
}

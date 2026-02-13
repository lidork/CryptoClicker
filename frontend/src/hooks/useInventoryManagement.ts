import { useState, useCallback } from 'react'
import { Contract, isAddress } from 'ethers'
import { toast } from 'react-toastify'
import { GameItemABI } from '../abis/contractABIs'
import { GAME_ITEM_ADDRESS } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { InventoryItem, ItemHistoryRecord, ItemMetadata, AgentDetails, AgentClassConfig, AgentHistoryEvent } from '../types'

export function useInventoryManagement(signer: JsonRpcSigner | null, userAddress: string | null) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [selectedItemHistory, setSelectedItemHistory] = useState<ItemHistoryRecord[]>([])
  const [selectedItemMetadata, setSelectedItemMetadata] = useState<ItemMetadata | null>(null)
  const [transferTarget, setTransferTarget] = useState("")
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentDetails | null>(null)
  const [agentBeingViewed, setAgentBeingViewed] = useState<string | null>(null)
  const [agentSupplies, setAgentSupplies] = useState<Record<string, number>>({})
  const [agentHistory, setAgentHistory] = useState<AgentHistoryEvent[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const fetchInventory = useCallback(async () => {
    if (signer && userAddress) {
      try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
        const filter = gameItemContract.filters.Transfer(null, userAddress)
        const events = await gameItemContract.queryFilter(filter, 0)
        
        const loadedInventory = await Promise.all(events.map(async (event) => {
          try {
            // @ts-expect-error Ethers v6 args
            const tokenId = event.args[2]
            const owner = await gameItemContract.ownerOf(tokenId)
            
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
              const uri = await gameItemContract.tokenURI(tokenId)
              
              let nftType
              try {
                nftType = await gameItemContract.getNftType(tokenId)
              } catch (e) {
                console.warn(`Could not get NFT type for ${tokenId}:`, e)
                nftType = 0
              }
              
              const isAgent = Number(nftType) === 1
              
              if (isAgent) {
                try {
                  const stats = await gameItemContract.getAgentStats(tokenId)
                  
                  return {
                    id: tokenId.toString(),
                    uri,
                    strength: Number(stats.strength),
                    isAgent: true,
                    agentClass: stats.agentClass,
                    level: Number(stats.level),
                    miningRate: Number(stats.miningRate),
                    experience: Number(stats.experience),
                    xpGainVariance: Number(stats.xpGainVariance)
                  }
                } catch (agentErr) {
                  console.error(`Failed to fetch agent ${tokenId} stats:`, agentErr)
                  return null
                }
              } else {
                try {
                  const meta = await gameItemContract.items(tokenId)
                  return {
                    id: tokenId.toString(),
                    uri,
                    strength: Number(meta.strength),
                    isAgent: false
                  }
                } catch (lootErr) {
                  console.error(`Failed to fetch lootbox ${tokenId} stats:`, lootErr)
                  return null
                }
              }
            }
          } catch (err) {
            console.warn("Item fetch error", err)
          }
          return null
        }))

        const uniqueItemsMap = new Map()
        loadedInventory.forEach(item => {
          if (item) {
            uniqueItemsMap.set(item.id, item)
          }
        })
        
        const inventoryArray = Array.from(uniqueItemsMap.values())
        setInventory(inventoryArray)
      } catch (e) {
        console.error("Error fetching inventory:", e)
      }
    }
  }, [signer, userAddress])

  const fetchItemDetails = useCallback(async (tokenId: string) => {
    if (!signer) return
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      
      // Note: getItemHistory is in ABI but not implemented in current contract
      // Silently default to empty history
      const history: ItemHistoryRecord[] = []
      setSelectedItemHistory(history)

      let meta = { purchasePrice: 0, mintDate: 0, originalCreator: "Unknown", strength: 0 }
      try {
        meta = await gameItemContract.items(tokenId)
      } catch(e) { 
        console.warn("Could not fetch metadata", e) 
      }

      setSelectedItemMetadata({
        purchasePrice: meta.purchasePrice.toString(),
        mintDate: Number(meta.mintDate) > 0 ? new Date(Number(meta.mintDate) * 1000).toLocaleString() : "Unknown",
        originalCreator: meta.originalCreator,
        strength: (Number(meta.strength) / 100).toFixed(2)
      })
      
      setSelectedTokenId(tokenId)
    } catch (e) {
      console.error("Error fetching item details:", e)
      toast.error("Failed to fetch details. Is the contract deployed?")
    }
  }, [signer])

  const fetchAgentDetails = useCallback(async (tokenId: string) => {
    if (!signer) return
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      
      const agentStats = await gameItemContract.getAgentStats(tokenId)
      
      setSelectedAgentDetails({
        tokenId,
        level: Number(agentStats.level),
        miningRate: Number(agentStats.miningRate),
        creationTime: Number(agentStats.creationTime),
        experience: Number(agentStats.experience),
        strength: Number(agentStats.strength),
        agentClass: agentStats.agentClass,
        xpGainVariance: Number(agentStats.xpGainVariance)
      })
      setAgentBeingViewed(tokenId)

      // Agents don't have transfer history in current implementation
      const normalizedHistory: ItemHistoryRecord[] = []
      setSelectedItemHistory(normalizedHistory)
    } catch (e) {
      console.error("Error fetching agent details:", e)
      toast.error("Failed to fetch agent details")
    }
  }, [signer])

  const fetchAgentHistory = useCallback(async (tokenId: string) => {
    if (!signer) return
    setIsLoadingHistory(true)
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const tokenIdBigInt = BigInt(tokenId)
      
      // Query all agent-related events for this tokenId
      const [createdEvents, levelUpEvents, xpGainEvents, questSentEvents, questReturnEvents] = await Promise.all([
        gameItemContract.queryFilter(gameItemContract.filters.AgentCreated(tokenIdBigInt), 0),
        gameItemContract.queryFilter(gameItemContract.filters.AgentLeveledUp(tokenIdBigInt), 0),
        gameItemContract.queryFilter(gameItemContract.filters.ExperienceGained(tokenIdBigInt), 0),
        gameItemContract.queryFilter(gameItemContract.filters.AgentSentOnQuest(tokenIdBigInt), 0),
        gameItemContract.queryFilter(gameItemContract.filters.AgentReturnedFromQuest(tokenIdBigInt), 0),
      ])

      const allEvents: AgentHistoryEvent[] = []

      // Parse created events
      for (const event of createdEvents) {
        const block = await event.getBlock()
        allEvents.push({
          type: 'created',
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {}
        })
      }

      // Parse level up events
      for (const event of levelUpEvents) {
        const block = await event.getBlock()
        // @ts-expect-error Ethers v6 args
        const [, newLevel, newMiningRate] = event.args
        allEvents.push({
          type: 'levelUp',
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            level: Number(newLevel),
            newMiningRate: Number(newMiningRate)
          }
        })
      }

      // Parse XP gain events
      for (const event of xpGainEvents) {
        const block = await event.getBlock()
        // @ts-expect-error Ethers v6 args
        const [, xpAmount, totalExperience] = event.args
        allEvents.push({
          type: 'xpGain',
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            xpAmount: Number(xpAmount),
            totalExperience: Number(totalExperience)
          }
        })
      }

      // Parse quest sent events
      for (const event of questSentEvents) {
        const block = await event.getBlock()
        // @ts-expect-error Ethers v6 args
        const [, , duration] = event.args
        allEvents.push({
          type: 'questStarted',
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            duration: Number(duration)
          }
        })
      }

      // Parse quest return events
      for (const event of questReturnEvents) {
        const block = await event.getBlock()
        // @ts-expect-error Ethers v6 args
        const [, , xpGained, tokensEarned, lootRarity] = event.args
        allEvents.push({
          type: 'questCompleted',
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          data: {
            xpAmount: Number(xpGained),
            tokensEarned: Number(tokensEarned),
            lootRarity: String(lootRarity)
          }
        })
      }

      // Sort by block number (chronological order)
      allEvents.sort((a, b) => a.blockNumber - b.blockNumber)
      setAgentHistory(allEvents)
    } catch (e) {
      console.error("Error fetching agent history:", e)
      toast.error("Failed to load agent history")
    } finally {
      setIsLoadingHistory(false)
    }
  }, [signer])

  const fetchAgentSupplies = useCallback((agentClasses: AgentClassConfig[]) => {
    // Calculate agent supplies from inventory data (client-side)
    // No contract call needed - prevents issues with non-existent contract function
    const supplies: Record<string, number> = {}
    
    for (const agentClass of agentClasses) {
      const count = inventory.filter(item => 
        item.isAgent && item.agentClass === agentClass.name
      ).length
      supplies[agentClass.name] = count
    }
    
    setAgentSupplies(supplies)
  }, [inventory])

  const transferItem = useCallback(async (selectedTokenId: string) => {
    if (!signer || !userAddress) return

    if (!transferTarget) {
      toast.warning("Please enter a recipient address.")
      return
    }

    if (!isAddress(transferTarget)) {
      toast.error("Invalid Ethereum address. Please check the address and try again.")
      return
    }
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      
      const txPromise = async () => {
        const tx = await gameItemContract.transferFrom(userAddress, transferTarget, selectedTokenId)
        console.log("Transfer tx:", tx.hash)
        return await tx.wait()
      }

      await toast.promise(
        txPromise(),
        {
          pending: `Transferring item #${selectedTokenId} to ${transferTarget.slice(0, 6)}...`,
          success: 'Item transferred successfully!',
          error: 'Transfer failed'
        }
      )
      
      setTransferTarget("")
      setSelectedTokenId(null)
      await fetchInventory()
    } catch (e) {
      console.error("Transfer failed:", e)
      toast.error("Transfer failed. Check console for details.")
    }
  }, [signer, userAddress, transferTarget, fetchInventory])

  return {
    inventory,
    selectedTokenId,
    selectedItemHistory,
    selectedItemMetadata,
    transferTarget,
    selectedAgentDetails,
    agentBeingViewed,
    agentSupplies,
    agentHistory,
    isLoadingHistory,
    setSelectedTokenId,
    setAgentBeingViewed,
    setTransferTarget,
    fetchInventory,
    fetchItemDetails,
    fetchAgentDetails,
    fetchAgentSupplies,
    fetchAgentHistory,
    transferItem
  }
}

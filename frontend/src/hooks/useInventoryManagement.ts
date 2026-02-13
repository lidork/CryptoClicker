import { useState, useCallback } from 'react'
import { Contract, isAddress } from 'ethers'
import { toast } from 'react-toastify'
import { GameItemABI } from '../abis/contractABIs'
import { GAME_ITEM_ADDRESS } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { InventoryItem, ItemHistoryRecord, ItemMetadata, AgentDetails, AgentClassConfig } from '../types'

export function useInventoryManagement(signer: JsonRpcSigner | null, userAddress: string | null) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [selectedItemHistory, setSelectedItemHistory] = useState<ItemHistoryRecord[]>([])
  const [selectedItemMetadata, setSelectedItemMetadata] = useState<ItemMetadata | null>(null)
  const [transferTarget, setTransferTarget] = useState("")
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentDetails | null>(null)
  const [agentBeingViewed, setAgentBeingViewed] = useState<string | null>(null)
  const [agentSupplies, setAgentSupplies] = useState<Record<string, number>>({})

  const fetchInventory = useCallback(async () => {
    if (signer && userAddress) {
      try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
        const filter = gameItemContract.filters.Transfer(null, userAddress)
        const events = await gameItemContract.queryFilter(filter, 0)
        
        console.log(`Found ${events.length} transfer events for ${userAddress}`)
        
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
              console.log(`Token ${tokenId}: isAgent=${isAgent}, nftType=${nftType}`)
              
              if (isAgent) {
                try {
                  const stats = await gameItemContract.getAgentStats(tokenId)
                  console.log(`Agent ${tokenId}: class=${stats.agentClass}, level=${stats.level}`)
                  
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
        console.log(`Loaded inventory: ${inventoryArray.length} items total`, inventoryArray)
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
      
      let history: ItemHistoryRecord[] = []
      try {
        const rawHistory = await gameItemContract.getItemHistory(tokenId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        history = rawHistory.map((record: any) => ({
          from: record.from,
          to: record.to
        }))
      } catch(e) { 
        console.warn("Could not fetch history", e) 
      }
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

      const normalizedHistory: ItemHistoryRecord[] = []
      setSelectedItemHistory(normalizedHistory)
    } catch (e) {
      console.error("Error fetching agent details:", e)
      toast.error("Failed to fetch agent details")
    }
  }, [signer])

  const fetchAgentSupplies = useCallback(async (agentClasses: AgentClassConfig[]) => {
    if (!signer) return
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const supplies: Record<string, number> = {}
      
      for (const agentClass of agentClasses) {
        const supply = await gameItemContract.getAgentSupplyByClass(agentClass.name)
        supplies[agentClass.name] = Number(supply)
      }
      
      setAgentSupplies(supplies)
    } catch (e) {
      console.warn("Error fetching agent supplies:", e)
    }
  }, [signer])

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
    setSelectedTokenId,
    setAgentBeingViewed,
    setTransferTarget,
    fetchInventory,
    fetchItemDetails,
    fetchAgentDetails,
    fetchAgentSupplies,
    transferItem
  }
}

import { useState, useCallback, useEffect } from 'react'
import { Contract } from 'ethers'
import { toast } from 'react-toastify'
import { GameItemABI } from '../abis/contractABIs'
import { GAME_ITEM_ADDRESS } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { QuestInfo, InventoryItem } from '../types'

interface RewardPreview {
  agentId: string
  tokens: string
  rarity: string
  hasLoot: boolean
  xpGain: string
}

export function useQuestSystem(
  signer: JsonRpcSigner | null,
  userAddress: string | null,
  inventory: InventoryItem[],
  equippedAgentId: string | null,
  setEquippedAgentId: (id: string | null) => void
) {
  const [questingAgents, setQuestingAgents] = useState<Record<string, QuestInfo>>({})
  const [rewardPreview, setRewardPreview] = useState<RewardPreview | null>(null)
  const [showRewardPreview, setShowRewardPreview] = useState(false)

  const fetchQuestStatuses = useCallback(async () => {
    if (!signer) return
    
    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
    const agents = inventory.filter(i => i.isAgent)
    
    const statuses: Record<string, QuestInfo> = {}
    
    await Promise.all(agents.map(async (agent) => {
      try {
        const tokenIdBigInt = BigInt(agent.id)
        const status = await gameItemContract.getQuestStatus(tokenIdBigInt)
        if (status.isOnQuest) {
          const endTime = Number(status.questEndTime)
          const isComplete = Date.now() / 1000 >= endTime
          statuses[agent.id] = {
            endTime,
            duration: Number(status.questEndTime) - (Number(status.questEndTime) - Number(status.remainingTime)),
            isComplete
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch quest status for ${agent.id}. Assuming not on quest.`, e)
      }
    }))
    
    setQuestingAgents(statuses)
  }, [signer, inventory])

  // Fetch quest statuses when inventory changes
  useEffect(() => {
    if (inventory.length > 0 && signer) {
      // Intentionally calling setState in effect for quest synchronization
      // eslint-disable-next-line
      void fetchQuestStatuses()
    }
  }, [inventory.length, signer, fetchQuestStatuses])

  // Poll quest statuses every 30 seconds
  useEffect(() => {
    if (!signer || inventory.length === 0) return
    
    const interval = setInterval(() => {
      fetchQuestStatuses()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [signer, inventory.length, fetchQuestStatuses])

  const previewQuestRewards = useCallback(async (tokenId: string) => {
    if (!signer) return
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const tokenIdBigInt = BigInt(tokenId)
      
      const preview = await gameItemContract.previewQuestRewards(tokenIdBigInt)
      const tokensInCLK = Number(preview.tokens) / 1e18
      
      setRewardPreview({
        agentId: tokenId,
        tokens: tokensInCLK.toFixed(2),
        rarity: preview.rarity,
        hasLoot: preview.itemUri.length > 0,
        xpGain: Number(preview.xpGain).toString()
      })
      setShowRewardPreview(true)
    } catch (e) {
      console.error("Failed to preview rewards:", e)
      toast.error("Could not preview rewards")
    }
  }, [signer])

  const sendAgentOnQuest = useCallback(async (tokenId: string, questDuration: number, fetchInventory: () => Promise<void>) => {
    if (!signer || !userAddress) {
      toast.error("Wallet not connected!")
      return
    }
    
    // Unequip if this agent is equipped
    if (equippedAgentId === tokenId) {
      setEquippedAgentId(null)
    }
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const tokenIdBigInt = BigInt(tokenId)
      console.log(`Sending agent ${tokenIdBigInt} on quest for ${questDuration} seconds`)
      
      const txPromise = async () => {
        console.log("Attempting to call sendAgentOnQuest...")
        const tx = await gameItemContract.sendAgentOnQuest(tokenIdBigInt, questDuration)
        console.log("Quest transaction submitted:", tx.hash)
        const receipt = await tx.wait()
        console.log("Quest transaction confirmed:", receipt?.hash)
        return receipt
      }
      
      await toast.promise(txPromise(), {
        pending: "Sending agent on quest...",
        success: "Agent departed! Safe travels! 🗺️"
      })
      
      await fetchQuestStatuses()
      await fetchInventory()
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error("Quest start failed:", e)
      
      if (errorMsg.includes("Only agents can quest")) {
        toast.error("This isn't an agent! Only agents can go on quests.")
      } else if (errorMsg.includes("Not your agent")) {
        toast.error("You don't own this agent!")
      } else if (errorMsg.includes("Agent already on quest")) {
        toast.error("This agent is already on a quest!")
      } else if (errorMsg.includes("Minimum 1 minute quest")) {
        toast.error("Quest duration must be at least 1 minute!")
      } else {
        toast.error("Failed to send agent on quest")
      }
    }
  }, [signer, userAddress, equippedAgentId, setEquippedAgentId, fetchQuestStatuses])

  const completeQuest = useCallback(async (tokenId: string, fetchInventory: () => Promise<void>, fetchBalance: () => Promise<void>) => {
    if (!signer || !userAddress) {
      toast.error("Wallet not connected!")
      return
    }
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const tokenIdBigInt = BigInt(tokenId)
      console.log(`Completing quest for agent ${tokenIdBigInt}`)
      
      let rewardText = "Agent returned! 🎉"
      
      try {
        const preview = await gameItemContract.previewQuestRewards(tokenIdBigInt)
        const tokensInCLK = Number(preview.tokens) / 1e18
        rewardText = `🎉 ${preview.rarity} Reward: ${tokensInCLK.toFixed(2)} CLK${preview.itemUri.length > 0 ? ' + Loot Item' : ''}`
      } catch (e) {
        console.warn("Could not preview rewards:", e)
      }
      
      const txPromise = async () => {
        console.log("Attempting to call completeQuest...")
        const tx = await gameItemContract.completeQuest(tokenIdBigInt)
        console.log("Complete quest transaction submitted:", tx.hash)
        const receipt = await tx.wait()
        console.log("Complete quest transaction confirmed:", receipt?.hash)
        return receipt
      }
      
      await toast.promise(txPromise(), {
        pending: "Completing quest...",
        success: "Quest complete! ✨",
      })
      
      toast.info(rewardText, { autoClose: 5000 })
      setShowRewardPreview(false)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      await fetchInventory()
      await fetchBalance()
      await fetchQuestStatuses()
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error("Quest completion failed:", e)
      
      if (errorMsg.includes("Agent not on quest")) {
        toast.error("This agent is not on a quest!")
      } else if (errorMsg.includes("Not your quest")) {
        toast.error("You don't own this quest!")
      } else if (errorMsg.includes("Quest not finished")) {
        toast.error("The quest is still in progress!")
      } else {
        toast.error("Failed to complete quest")
      }
    }
  }, [signer, userAddress, fetchQuestStatuses])

  return {
    questingAgents,
    rewardPreview,
    showRewardPreview,
    setRewardPreview,
    setShowRewardPreview,
    previewQuestRewards,
    sendAgentOnQuest,
    completeQuest,
    fetchQuestStatuses
  }
}

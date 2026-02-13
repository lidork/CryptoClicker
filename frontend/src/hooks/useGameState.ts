import { useState, useEffect, useCallback } from 'react'
import { Contract, parseEther } from 'ethers'
import { toast } from 'react-toastify'
import { ClickerTokenABI } from '../abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, CLICKS_PER_TOKEN } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { InventoryItem, QuestInfo } from '../types'

export function useGameState(signer: JsonRpcSigner | null, userAddress: string | null, inventory: InventoryItem[], equippedAgentId: string | null, questingAgents: Record<string, QuestInfo>) {
  const [clickCount, setClickCount] = useState(0)
  const [unclaimedClicks, setUnclaimedClicks] = useState(0)
  const [clickMultiplier, setClickMultiplier] = useState(1)
  const [passiveIncome, setPassiveIncome] = useState(0)
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false)

  // Calculate Game Bonuses based on Inventory and Agent
  useEffect(() => {
    let newMultiplier = 1
    let newPassive = 0

    // Lootbox items - apply item stats
    inventory.forEach(item => {
      if (!item.isAgent) {
        const stats = getItemStats(item.uri, item.strength)
        newMultiplier += stats.multiplier
        newPassive += stats.passive
      }
    })

    // Equipped agent bonuses
    if (equippedAgentId && !questingAgents[equippedAgentId]) {
      const agent = inventory.find(i => i.id === equippedAgentId && i.isAgent)
      if (agent && agent.level) {
        const agentBonus = calculateEquippedAgentBonus(agent)
        newMultiplier += agentBonus.clickBonus
        newPassive += agentBonus.passiveBonus
      }
    }

    setClickMultiplier(parseFloat(newMultiplier.toFixed(2)))
    setPassiveIncome(parseFloat(newPassive.toFixed(2)))
  }, [inventory, equippedAgentId, questingAgents])

  // Passive Income Timer
  useEffect(() => {
    if (passiveIncome === 0) return
    
    const timer = setInterval(() => {
      setUnclaimedClicks(prev => prev + passiveIncome)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [passiveIncome])

  const handleClick = useCallback(() => {
    if (!userAddress && (unclaimedClicks + 1) >= CLICKS_PER_TOKEN) {
      toast.info("You've earned your first coin! Please connect your wallet to continue earning and claim your rewards.")
      return
    }
    setClickCount((prev) => prev + 1)
    setUnclaimedClicks((prev) => prev + clickMultiplier)
  }, [userAddress, unclaimedClicks, clickMultiplier])

  const handlePayout = useCallback(async () => {
    if (!signer || !userAddress) {
      toast.error("Please connect your wallet first.")
      return
    }

    const potentialTokens = Math.floor(unclaimedClicks / CLICKS_PER_TOKEN)
    if (potentialTokens === 0) {
      toast.info(`You need ${CLICKS_PER_TOKEN} clicks to earn 1 token!`)
      return
    }

    let tokensToMint = potentialTokens
    if (tokensToMint > 10) {
      const confirmed = window.confirm(
        `You have earned enough clicks for ${tokensToMint} tokens, but the transaction limit is 10 tokens per batch.\n\nDo you want to payout 10 tokens now?`
      )
      if (!confirmed) return
      tokensToMint = 10
    }

    setIsPayoutProcessing(true)

    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const amount = parseEther(tokensToMint.toString())
      
      const txPromise = async () => {
        const tx = await tokenContract.mint(userAddress, amount)
        console.log("Payout transaction sent:", tx.hash)
        return await tx.wait()
      }

      await toast.promise(
        txPromise(),
        {
          pending: `Minting ${tokensToMint} tokens...`,
          success: `Successfully minted ${tokensToMint} tokens!`,
          error: 'Transaction failed'
        }
      )
      
      setUnclaimedClicks((prev) => prev - (tokensToMint * CLICKS_PER_TOKEN))
    } catch (e: unknown) {
      console.error("Payout failed:", e)
      toast.error(`Payout failed: ${e instanceof Error ? e.message : 'Transaction failed'}`)
    } finally {
      setIsPayoutProcessing(false)
    }
  }, [signer, userAddress, unclaimedClicks])

  return {
    clickCount,
    unclaimedClicks,
    clickMultiplier,
    passiveIncome,
    isPayoutProcessing,
    handleClick,
    handlePayout
  }
}

// Helper functions
function getItemStats(uri: string, strengthVal: number) {
  const strengthDecimal = strengthVal / 100

  switch (uri) {
    case "ipfs://valid-uri-1": // Sword
      return { multiplier: strengthDecimal, passive: 0 }
    case "ipfs://valid-uri-2": // Shield
      return { multiplier: 0, passive: strengthDecimal * 10 }
    case "ipfs://valid-uri-3": // Scepter
      return { multiplier: 50, passive: 20 }
    default:
      return { multiplier: 0, passive: 0 }
  }
}

function calculateEquippedAgentBonus(agent: InventoryItem) {
  if (!agent.level || !agent.agentClass) return { clickBonus: 0, passiveBonus: 0 }
  
  switch (agent.agentClass) {
    case "Warrior":
      return {
        clickBonus: agent.level * 0.05,
        passiveBonus: 0
      }
    case "Guardian":
      return {
        clickBonus: 0,
        passiveBonus: agent.level * 0.1
      }
    case "Sorcerer":
      return {
        clickBonus: agent.level * 0.02,
        passiveBonus: agent.level * 0.08
      }
    default:
      return { clickBonus: 0, passiveBonus: 0 }
  }
}

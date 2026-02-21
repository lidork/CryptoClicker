import { useState, useEffect, useCallback } from 'react'
import { Contract } from 'ethers'
import { toast } from 'react-toastify'
import { ClickerTokenABI } from '../abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, CLICKS_PER_TOKEN, MAX_TOKENS_PER_TX, SIGNER_API_URL } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { InventoryItem, QuestInfo } from '../types'

export function useGameState(signer: JsonRpcSigner | null, userAddress: string | null, inventory: InventoryItem[], equippedAgentId: string | null, questingAgents: Record<string, QuestInfo>, fetchBalance?: () => Promise<void>) {
  const [clickCount, setClickCount] = useState(0)
  const [unclaimedClicks, setUnclaimedClicks] = useState(0)
  const [clickMultiplier, setClickMultiplier] = useState(1)
  const [passiveIncome, setPassiveIncome] = useState(0)
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false)

  useEffect(() => {
    if (!userAddress) {
      setClickCount(0)
      setUnclaimedClicks(0)
      setIsPayoutProcessing(false)
    }
  }, [userAddress])

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
    if (tokensToMint > MAX_TOKENS_PER_TX) {
      const confirmed = window.confirm(
        `You have earned enough clicks for ${tokensToMint} tokens, but the transaction limit is ${MAX_TOKENS_PER_TX} tokens per batch.\n\nDo you want to payout ${MAX_TOKENS_PER_TX} tokens now?`
      )
      if (!confirmed) return
      tokensToMint = MAX_TOKENS_PER_TX
    }

    const clicksToMint = tokensToMint * CLICKS_PER_TOKEN

    setIsPayoutProcessing(true)

    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      
      // PHASE 3: Get current nonce for the user
      console.log("Fetching nonce for user:", userAddress)
      const nonce = await tokenContract.getMintNonce(userAddress)
      console.log("Current nonce:", nonce.toString())

      // PHASE 3: Request signature from backend validator (ERC-8004 Validation Registry)
      console.log("Requesting signature from validator service...")
      const signResponse = await fetch(`${SIGNER_API_URL}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          clickCount: clicksToMint,
          nonce: Number(nonce)
        })
      })

      if (!signResponse.ok) {
        const error = await signResponse.json()
        throw new Error(error.error || 'Failed to get signature from validator')
      }

      const { signature, amount: validatedAmount, clkAmount } = await signResponse.json()
      const mintedTokens = Number(clkAmount) || tokensToMint
      console.log("Signature obtained from validator:", signature)
      
      const txPromise = async () => {
        // PHASE 3: Pass signature and nonce to mint function (using validated amount from backend)
        const tx = await tokenContract.mint(userAddress, validatedAmount, signature, nonce)
        console.log("Payout transaction sent:", tx.hash)
        return await tx.wait()
      }

      await toast.promise(
        txPromise(),
        {
          pending: `Minting ${mintedTokens} tokens with signature validation...`,
          success: `✅ Successfully minted ${mintedTokens} tokens! Signature verified on-chain.`,
          error: 'Transaction failed'
        }
      )
      
      setUnclaimedClicks((prev) => prev - (mintedTokens * CLICKS_PER_TOKEN))
      
      // Refresh balance after successful mint
      if (fetchBalance) {
        await fetchBalance()
      }
    } catch (e: unknown) {
      console.error("Payout failed:", e)
      if (e instanceof Error) {
        if (e.message.includes('Invalid signature')) {
          toast.error('Signature validation failed: Not signed by authorized validator')
        } else if (e.message.includes('Invalid nonce')) {
          toast.error('Nonce mismatch: Please try again')
        } else if (e.message.includes('Cooldown') || e.message.includes('wait')) {
          toast.error('⏰ Please wait 1 minute between mints')
        } else if (e.message.includes('user rejected') || e.message.includes('User denied')) {
          toast.error('Transaction cancelled')
        } else {
          toast.error(`Payout failed: ${e.message}`)
        }
      } else {
        toast.error('Transaction failed')
      }
    } finally {
      setIsPayoutProcessing(false)
    }
  }, [signer, userAddress, unclaimedClicks, fetchBalance])

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

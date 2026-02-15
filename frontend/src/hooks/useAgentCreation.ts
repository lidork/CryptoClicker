import { useState, useCallback } from 'react'
import { Contract, parseEther, formatEther } from 'ethers'
import { toast } from 'react-toastify'
import { ClickerTokenABI, GameItemABI } from '../abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS } from '../constants'
import { JsonRpcSigner } from 'ethers'

import type { AgentClassConfig } from '../types'

export function useAgentCreation(signer: JsonRpcSigner | null, userAddress: string | null, tokenBalance: string) {
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [selectedAgentClass, setSelectedAgentClass] = useState<string | null>(null)
  const [showAgentCreationModal, setShowAgentCreationModal] = useState(false)
  const [dynamicAgentPrices, setDynamicAgentPrices] = useState<Record<string, string>>({})

  const fetchAgentPrices = useCallback(async (agentClasses: AgentClassConfig[]) => {
    if (!signer) return
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const prices: Record<string, string> = {}

      for (const agentClass of agentClasses) {
        const currentPriceWei = await gameItemContract.getDynamicAgentPrice(agentClass.name)
        prices[agentClass.name] = formatEther(currentPriceWei)
      }
      setDynamicAgentPrices(prices)
    } catch (e) {
      console.warn("Error fetching dynamic agent prices", e)
    }
  }, [signer])

  const createAgent = useCallback(async (
    agentClass: string,
    fetchBalance: () => Promise<void>,
    fetchInventory: () => Promise<void>,
    fetchAgentSupplies: (classes: AgentClassConfig[]) => Promise<void>,
    agentClasses: AgentClassConfig[]
  ) => {
    if (!signer || !userAddress) {
      toast.error("Connect wallet first!")
      return
    }

    // Get dynamic price for this agent class
    const agentPriceStr = dynamicAgentPrices[agentClass]
    if (!agentPriceStr) {
      toast.error("Price not loaded yet, please wait...")
      return
    }

    const agentPrice = parseFloat(agentPriceStr)
    const balance = parseFloat(tokenBalance)
    if (balance < agentPrice) {
      toast.error(`Insufficient funds! Agent costs ${agentPrice} CLK.`)
      return
    }

    setIsCreatingAgent(true)

    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)

      // Check allowance with dynamic price
      const costWei = parseEther(agentPriceStr)
      const allowance = await tokenContract.allowance(userAddress, GAME_ITEM_ADDRESS)

      if (allowance < costWei) {
        toast.info("Approving agent creation cost...")
        const txApprove = await tokenContract.approve(GAME_ITEM_ADDRESS, costWei)
        await txApprove.wait()
      }

      // Create agent
      const agentURI = `ipfs://agent-${agentClass.toLowerCase()}`
      
      const txPromise = async () => {
        const tx = await gameItemContract.mintAgent(userAddress, agentClass, agentURI)
        console.log("Agent creation tx:", tx.hash)
        return await tx.wait()
      }

      await toast.promise(
        txPromise(),
        {
          pending: `Creating ${agentClass} Agent...`,
          success: `${agentClass} Agent created! Your journey begins...`,
          error: "Failed to create agent"
        }
      )

      setSelectedAgentClass(null)
      setShowAgentCreationModal(false)
      
      // Add delay for blockchain processing, then refresh prices
      setTimeout(() => {
        fetchBalance()
        fetchInventory()
        fetchAgentSupplies(agentClasses)
        fetchAgentPrices(agentClasses)
      }, 2000)
    } catch (e: unknown) {
      console.error("Agent creation failed:", e)
      toast.error(`Failed to create agent: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setIsCreatingAgent(false)
    }
  }, [signer, userAddress, tokenBalance, dynamicAgentPrices, fetchAgentPrices])

  return {
    isCreatingAgent,
    selectedAgentClass,
    showAgentCreationModal,
    dynamicAgentPrices,
    setSelectedAgentClass,
    setShowAgentCreationModal,
    createAgent,
    fetchAgentPrices
  }
}

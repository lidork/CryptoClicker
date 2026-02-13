import { useState, useCallback } from 'react'
import { Contract, parseEther } from 'ethers'
import { toast } from 'react-toastify'
import { ClickerTokenABI, GameItemABI } from '../abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS, AGENT_MINT_COST } from '../constants'
import { JsonRpcSigner } from 'ethers'

import type { AgentClassConfig } from '../types'

export function useAgentCreation(signer: JsonRpcSigner | null, userAddress: string | null, tokenBalance: string) {
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [selectedAgentClass, setSelectedAgentClass] = useState<string | null>(null)
  const [showAgentCreationModal, setShowAgentCreationModal] = useState(false)

  const createAgent = useCallback(async (
    agentClass: string,
    fetchBalance: () => Promise<void>,
    fetchInventory: () => Promise<void>,
    fetchAgentSupplies: (classes: AgentClassConfig[]) => void,
    agentClasses: AgentClassConfig[]
  ) => {
    if (!signer || !userAddress) {
      toast.error("Connect wallet first!")
      return
    }

    const balance = parseFloat(tokenBalance)
    if (balance < AGENT_MINT_COST) {
      toast.error(`Insufficient funds! Agent costs ${AGENT_MINT_COST} CLK.`)
      return
    }

    setIsCreatingAgent(true)

    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)

      // Check allowance
      const costWei = parseEther(AGENT_MINT_COST.toString())
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
      
      // Add delay for blockchain processing
      setTimeout(() => {
        fetchBalance()
        fetchInventory()
        fetchAgentSupplies(agentClasses)
      }, 2000)
    } catch (e: unknown) {
      console.error("Agent creation failed:", e)
      toast.error(`Failed to create agent: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setIsCreatingAgent(false)
    }
  }, [signer, userAddress, tokenBalance])

  return {
    isCreatingAgent,
    selectedAgentClass,
    showAgentCreationModal,
    setSelectedAgentClass,
    setShowAgentCreationModal,
    createAgent
  }
}

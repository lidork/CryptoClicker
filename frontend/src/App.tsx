import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, JsonRpcSigner, Contract, formatEther, parseEther, ZeroAddress } from 'ethers'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'
import { AgentsScreen } from './components/AgentsScreen'
import { AgentCreationModal } from './components/AgentCreationModal'
import { AgentDetailsModal } from './components/AgentDetailsModal'
import { AdminScreen } from './components/AdminScreen'
import { GameScreen } from './components/GameScreen'
import { InventoryScreen } from './components/InventoryScreen'
import { ItemDetailsModal } from './components/ItemDetailsModal'
import { LeaderboardModal } from './components/LeaderboardModal'
import { MarketplaceScreen } from './components/MarketplaceScreen'
import { NavigationBar } from './components/NavigationBar'
import { RewardPreviewModal } from './components/RewardPreviewModal'
import { ShopScreen } from './components/ShopScreen'
import { WalletSection } from './components/WalletSection'
import { ClickerTokenABI, GameItemABI, MarketplaceABI } from './abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS, MARKETPLACE_ADDRESS, CLICKS_PER_TOKEN, SHOP_ITEMS, AGENT_CLASSES, QUEST_DURATIONS, VALIDATOR_ADDRESS } from './constants'
import { useGameState } from './hooks/useGameState'
import { useQuestSystem } from './hooks/useQuestSystem'
import { useInventoryManagement } from './hooks/useInventoryManagement'
import { useShopPurchasing } from './hooks/useShopPurchasing'
import { useAgentCreation } from './hooks/useAgentCreation'
import { useMarketplace } from './hooks/useMarketplace'
import { getAgentSkills } from './utils/gameLogic'
import type {
  AgentClassConfig,
  LeaderboardEntry,
  ShopItem
} from './types'


function App() {
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<'game' | 'shop' | 'agents' | 'inventory' | 'marketplace' | 'admin'>('game')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [tokenBalance, setTokenBalance] = useState("0")
  const [equippedAgentId, setEquippedAgentId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  
  // Validator information for debug menu
  const [validatorAddress, setValidatorAddress] = useState<string | null>(null)
  const [userNonce, setUserNonce] = useState<number>(0)

  // Custom hooks for major game systems
  const inventoryMgmt = useInventoryManagement(signer, userAddress)
  const shopPurchasing = useShopPurchasing(signer, userAddress, tokenBalance)
  const questSystem = useQuestSystem(signer, userAddress, inventoryMgmt.inventory, equippedAgentId, setEquippedAgentId)
  const agentCreation = useAgentCreation(signer, userAddress, tokenBalance)
  const marketplace = useMarketplace(signer, userAddress)

  const handleConnect = useCallback((_: BrowserProvider, newSigner: JsonRpcSigner, address: string) => {
    setSigner(newSigner)
    setUserAddress(address)
  }, [])

  const handleDisconnect = useCallback(() => {
    setSigner(null)
    setUserAddress(null)
    setTokenBalance("0")
    inventoryMgmt.setSelectedTokenId(null)
    setEquippedAgentId(null)
    setIsOwner(false)
    setCurrentScreen('game')
  }, [inventoryMgmt])

  const fetchBalance = useCallback(async () => {
    if (signer && userAddress) {
      try {
        const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
        const balance = await tokenContract.balanceOf(userAddress)
        setTokenBalance(formatEther(balance))
      } catch {
        console.log("Contract not deployed or address incorrect")
      }
    }
  }, [signer, userAddress])

  // Check if user is owner of contracts
  const checkOwnerStatus = useCallback(async () => {
    if (!signer || !userAddress) return
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)
      
      const [gameItemOwner, marketplaceOwner] = await Promise.all([
        gameItemContract.owner(),
        marketplaceContract.owner()
      ])
      
      const isContractOwner = userAddress.toLowerCase() === gameItemOwner.toLowerCase() || 
                             userAddress.toLowerCase() === marketplaceOwner.toLowerCase()
      setIsOwner(isContractOwner)
      
      if (isContractOwner) {
        console.log('✅ Owner access granted')
      }
    } catch (error) {
      console.error('Error checking owner status:', error)
      setIsOwner(false)
    }
  }, [signer, userAddress])

  // Game state with actual inventory for bonus calculations
  const gameStateUpdated = useGameState(
    signer,
    userAddress,
    inventoryMgmt.inventory,
    equippedAgentId,
    questSystem.questingAgents,
    fetchBalance
  )

  // Fetch initial data when user connects
  useEffect(() => {
    if (userAddress) {
      fetchBalance()
      shopPurchasing.fetchShopPrices()
      inventoryMgmt.fetchInventory()
      inventoryMgmt.fetchAgentSupplies(AGENT_CLASSES)
      checkOwnerStatus()
      agentCreation.fetchAgentPrices(AGENT_CLASSES)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddress])

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = () => {
        handleDisconnect()
        setCurrentScreen('game')
        toast.info("Account changed. Please reconnect your wallet.")
      }
      
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [handleDisconnect])

  // Listen for NFT Transfer events to update inventory automatically
  useEffect(() => {
    if (!signer || !userAddress) return

    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
    
    // Listen for transfers TO this user
    const filterTo = gameItemContract.filters.Transfer(null, userAddress)
    // Listen for transfers FROM this user
    const filterFrom = gameItemContract.filters.Transfer(userAddress, null)

    const handleTransfer = () => {
      console.log("NFT Transfer event detected, refreshing inventory...")
      inventoryMgmt.fetchInventory()
    }

    gameItemContract.on(filterTo, handleTransfer)
    gameItemContract.on(filterFrom, handleTransfer)

    return () => {
      gameItemContract.off(filterTo, handleTransfer)
      gameItemContract.off(filterFrom, handleTransfer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, userAddress])

  const toggleDebug = async () => {
    const code = prompt("Enter Debug Code:")
    if (code === import.meta.env.VITE_DEBUG_CODE) {
      setShowDebug(true)
      toast.success("Debug Mode Activated! 🛠️")
      // PHASE 3: Fetch validator info when debug menu opens
      await fetchValidatorInfo()
    } else if (code) {
      toast.error("Invalid Code")
    }
  }

  // PHASE 3: Fetch validator address and user nonce
  const fetchValidatorInfo = async () => {
    if (!signer || !userAddress) return
    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const validator = await tokenContract.validator()
      const nonce = await tokenContract.getMintNonce(userAddress)
      setValidatorAddress(validator)
      setUserNonce(Number(nonce))
      console.log("Validator:", validator)
      console.log("User Nonce:", nonce.toString())
    } catch (e) {
      console.error("Failed to fetch validator info:", e)
    }
  }

  const debugMintTokens = async () => {
    if (!signer || !userAddress) return
    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const amount = parseEther("500")
      const tx = await tokenContract.ownerMint(userAddress, amount)
      await tx.wait()
      toast.success("Debug: Minted 500 Tokens")
      fetchBalance()
    } catch (e) {
      console.error(e)
      toast.error("Debug Mint Failed (Are you owner?)")
    }
  }

  const debugResetClicks = () => {
    // Note: These would need to be state vars in game state hook if we want to reset them
    toast.info("Debug: Use browser dev tools to reset game state")
  }

  const debugSendQuickQuest = async () => {
    if (!signer) return
    
    const agents = inventoryMgmt.inventory.filter(i => i.isAgent && !questSystem.questingAgents[i.id])
    if (agents.length === 0) {
      toast.error("No available agents for quest")
      return
    }

    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const tokenId = agents[0].id
      const tx = await gameItemContract.sendAgentOnQuest(tokenId, QUEST_DURATIONS.DEBUG.seconds)
      await tx.wait()
      toast.success(`Agent #${tokenId} sent on 1-minute quest!`)
      questSystem.fetchQuestStatuses()
    } catch (e) {
      console.error(e)
      toast.error("Failed to send on quest")
    }
  }

  // Item stats mapping for equipment bonuses
  const getItemStats = (uri: string, strengthVal: number) => {
    const strengthDecimal = strengthVal / 100
    switch (uri) {
      case "ipfs://valid-uri-1": return { multiplier: strengthDecimal, passive: 0 }
      case "ipfs://valid-uri-2": return { multiplier: 0, passive: strengthDecimal * 10 }
      case "ipfs://valid-uri-3": return { multiplier: 50, passive: 20 }
      default: return { multiplier: 0, passive: 0 }
    }
  }

  const fetchLeaderboard = async () => {
    if (!signer && !window.ethereum) return

    const provider = new BrowserProvider(window.ethereum)
    const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, provider)
    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, provider)
    const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, provider)

    try {
      toast.info("Indexing blockchain events for leaderboard...")
      
      const [gameItemOwner, marketplaceOwner] = await Promise.all([
        gameItemContract.owner(),
        marketplaceContract.owner()
      ])

      const knownAddresses = new Set([
        CLICKER_TOKEN_ADDRESS.toLowerCase(),
        GAME_ITEM_ADDRESS.toLowerCase(),
        MARKETPLACE_ADDRESS.toLowerCase(),
        VALIDATOR_ADDRESS.toLowerCase()
      ])

      const addressLabels = new Map<string, string>()
      ;[gameItemOwner, marketplaceOwner].forEach((addr) => {
        if (addr) {
          addressLabels.set(addr.toLowerCase(), "Game Owner")
        }
      })

      const filter = tokenContract.filters.Transfer()
      const events = await tokenContract.queryFilter(filter, 0)

      const balances: Record<string, bigint> = {}

      events.forEach((event) => {
        // @ts-expect-error Ethers args
        const from = event.args[0]
        // @ts-expect-error Ethers args
        const to = event.args[1]
        // @ts-expect-error Ethers args
        const value = event.args[2]

        if (from !== ZeroAddress) {
          balances[from] = (balances[from] || 0n) - value
        }
        if (to !== ZeroAddress) {
          balances[to] = (balances[to] || 0n) + value
        }
      })

      const sortedList = Object.entries(balances)
        .map(([addr, bal]) => ({
          address: addr,
          balance: parseFloat(formatEther(bal))
        }))
        .filter((item) => item.balance > 0)
        .filter((item) => {
          const lower = item.address.toLowerCase()
          if (addressLabels.has(lower)) return true
          return !knownAddresses.has(lower)
        })
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10)
        .map(item => ({
          address: item.address,
          balance: item.balance.toFixed(2),
          label: addressLabels.get(item.address.toLowerCase())
        }))

      setLeaderboard(sortedList)
      setShowLeaderboard(true)
    } catch (e) {
      console.error("Leaderboard error:", e)
      toast.error("Could not fetch leaderboard data.")
    }
  }

  const addToWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: CLICKER_TOKEN_ADDRESS,
              symbol: 'CLK',
              decimals: 18,
              image: 'https://placehold.co/200x200/png?text=CLK',
            },
          },
        })
      } catch (error) {
        console.error(error)
      }
    } else {
      toast.error("Metamask is not installed!")
    }
  }

  const equipAgent = (tokenId: string) => {
    const agent = inventoryMgmt.inventory.find(i => i.id === tokenId && i.isAgent)
    if (!agent) return
    
    if (questSystem.questingAgents[tokenId]) {
      toast.error("Cannot equip an agent that is on a quest!")
      return
    }
    
    setEquippedAgentId(tokenId)
    toast.success(`${agent.agentClass} Agent equipped!`)
  }

  const unequipAgent = () => {
    setEquippedAgentId(null)
    toast.info("Agent unequipped")
  }

  return (
    <div className="app-container">
      <ToastContainer position="bottom-right" theme="dark" />
      <h1 onClick={toggleDebug} style={{cursor: 'pointer'}} title="Click for Admin">Crypto Clicker</h1>
      
      <WalletSection
        userAddress={userAddress}
        tokenBalance={tokenBalance}
        onAddToWallet={addToWallet}
        onLeaderboard={fetchLeaderboard}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <NavigationBar 
        currentScreen={currentScreen} 
        onChange={setCurrentScreen}
        isOwner={isOwner}
      />

      <div className="game-area">
        {currentScreen === 'game' && (
          <GameScreen
            clickCount={gameStateUpdated.clickCount}
            clickMultiplier={gameStateUpdated.clickMultiplier}
            passiveIncome={gameStateUpdated.passiveIncome}
            unclaimedClicks={gameStateUpdated.unclaimedClicks}
            clicksPerToken={CLICKS_PER_TOKEN}
            isPayoutProcessing={gameStateUpdated.isPayoutProcessing}
            onClick={gameStateUpdated.handleClick}
            onPayout={gameStateUpdated.handlePayout}
          />
        )}

        {showDebug && (
          <div style={{
            position: 'fixed', bottom: '10px', left: '10px', 
            background: 'rgba(50,0,0,0.9)', padding: '15px', 
            border: '1px solid red', borderRadius: '8px', zIndex: 2000,
            maxWidth: '300px'
          }}>
            <h3 style={{margin: '0 0 10px 0', color: 'red'}}>🛠️ Debug Menu</h3>
            
            {/* PHASE 3: Validator Information */}
            <div style={{marginBottom: '10px', fontSize: '11px', color: '#aaa', borderBottom: '1px solid #555', paddingBottom: '8px'}}>
              <div style={{marginBottom: '3px'}}>
                <strong style={{color: '#ff6b6b'}}>🔐 Validator:</strong>
                <div style={{fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all'}}>
                  {validatorAddress ? `${validatorAddress.slice(0,6)}...${validatorAddress.slice(-4)}` : 'Loading...'}
                </div>
              </div>
              <div>
                <strong style={{color: '#ff6b6b'}}>🔢 Your Nonce:</strong> {userNonce}
              </div>
              <div style={{marginTop: '5px', fontSize: '10px', fontStyle: 'italic', color: '#888'}}>
                ✓ Signature validation active
              </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
              <button onClick={debugMintTokens}>Give 500 Tokens (Owner)</button>
              <button onClick={debugResetClicks}>Set 100 Free Clicks</button>
              <button onClick={debugSendQuickQuest}>Send Agent on 1min Quest</button>
              <button onClick={fetchValidatorInfo}>🔄 Refresh Validator Info</button>
              <button onClick={() => setShowDebug(false)}>Close Menu</button>
            </div>
          </div>
        )}

        {currentScreen === 'shop' && (
          <ShopScreen
            items={SHOP_ITEMS as ShopItem[]}
            dynamicPrices={shopPurchasing.dynamicPrices}
            tokenBalance={tokenBalance}
            purchasingItemUri={shopPurchasing.purchasingItemUri}
            onBuy={(uri) => shopPurchasing.buyShopItem(uri, fetchBalance, inventoryMgmt.fetchInventory)}
          />
        )}

        {currentScreen === 'agents' && (
          <AgentsScreen
            agentClasses={AGENT_CLASSES as AgentClassConfig[]}
            tokenBalance={tokenBalance}
            agentSupplies={inventoryMgmt.agentSupplies}
            isCreatingAgent={agentCreation.isCreatingAgent}
            selectedAgentClass={agentCreation.selectedAgentClass}
            onOpenCreateModal={(agentClass) => {
              agentCreation.setSelectedAgentClass(agentClass)
              agentCreation.setShowAgentCreationModal(true)
            }}
            dynamicAgentPrices={agentCreation.dynamicAgentPrices}
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            inventory={inventoryMgmt.inventory}
            shopItems={SHOP_ITEMS as ShopItem[]}
            onItemClick={inventoryMgmt.fetchItemDetails}
            onAgentClick={inventoryMgmt.fetchAgentDetails}
          />
        )}

        {currentScreen === 'marketplace' && (
          <MarketplaceScreen
            signer={signer}
            userAddress={userAddress}
            inventory={inventoryMgmt.inventory}
            tokenBalance={tokenBalance}
            onRefreshInventory={inventoryMgmt.fetchInventory}
            onRefreshBalance={fetchBalance}
          />
        )}

        {currentScreen === 'admin' && (
          <AdminScreen
            signer={signer}
            userAddress={userAddress}
            tokenBalance={tokenBalance}
            onRefreshBalance={fetchBalance}
            onToggleDebug={() => setShowDebug(!showDebug)}
            showDebug={showDebug}
          />
        )}

        {agentCreation.showAgentCreationModal && agentCreation.selectedAgentClass && (
          <AgentCreationModal
            selectedAgentClass={agentCreation.selectedAgentClass}
            tokenBalance={tokenBalance}
            isCreatingAgent={agentCreation.isCreatingAgent}
            currentPrice={agentCreation.dynamicAgentPrices[agentCreation.selectedAgentClass] || '500'}
            onConfirm={(ac) => agentCreation.createAgent(ac, fetchBalance, inventoryMgmt.fetchInventory, inventoryMgmt.fetchAgentSupplies, AGENT_CLASSES)}
            onClose={() => agentCreation.setShowAgentCreationModal(false)}
          />
        )}

        {showLeaderboard && (
          <LeaderboardModal
            leaderboard={leaderboard}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {questSystem.showRewardPreview && questSystem.rewardPreview && (
          <RewardPreviewModal
            agentId={questSystem.rewardPreview.agentId}
            tokens={questSystem.rewardPreview.tokens}
            rarity={questSystem.rewardPreview.rarity}
            hasLoot={questSystem.rewardPreview.hasLoot}
            xpGain={questSystem.rewardPreview.xpGain}
            onConfirm={(agentId) => {
              questSystem.setShowRewardPreview(false)
              questSystem.completeQuest(agentId, inventoryMgmt.fetchInventory, fetchBalance)
            }}
            onCancel={() => {
              questSystem.setShowRewardPreview(false)
              questSystem.setRewardPreview(null)
            }}
          />
        )}

        {inventoryMgmt.selectedTokenId && !inventoryMgmt.agentBeingViewed && (
          <ItemDetailsModal
            selectedTokenId={inventoryMgmt.selectedTokenId}
            inventory={inventoryMgmt.inventory}
            shopItems={SHOP_ITEMS as ShopItem[]}
            selectedItemMetadata={inventoryMgmt.selectedItemMetadata}
            selectedItemHistory={inventoryMgmt.selectedItemHistory}
            transferTarget={inventoryMgmt.transferTarget}
            userAddress={userAddress}
            onClose={() => inventoryMgmt.setSelectedTokenId(null)}
            onTransferTargetChange={inventoryMgmt.setTransferTarget}
            onTransfer={() => inventoryMgmt.transferItem(inventoryMgmt.selectedTokenId!)}
            onListItem={async (tokenId: string, price: string) => {
              await marketplace.listItem(
                tokenId,
                price,
                GAME_ITEM_ADDRESS,
                GameItemABI,
                async () => {
                  await fetchBalance()
                  await inventoryMgmt.fetchInventory()
                  inventoryMgmt.setSelectedTokenId(null)
                }
              )
            }}
            getItemStats={getItemStats}
          />
        )}

        {inventoryMgmt.agentBeingViewed && inventoryMgmt.selectedAgentDetails && (
          <AgentDetailsModal
            selectedAgentDetails={inventoryMgmt.selectedAgentDetails}
            selectedItemHistory={inventoryMgmt.selectedItemHistory}
            agentHistory={inventoryMgmt.agentHistory}
            isLoadingHistory={inventoryMgmt.isLoadingHistory}
            userAddress={userAddress}
            getAgentSkills={getAgentSkills}
            onClose={() => inventoryMgmt.setAgentBeingViewed(null)}
            onLoadHistory={inventoryMgmt.fetchAgentHistory}
            isOnQuest={!!questSystem.questingAgents[inventoryMgmt.agentBeingViewed]}
            questEndTime={questSystem.questingAgents[inventoryMgmt.agentBeingViewed]?.endTime}
            questDuration={questSystem.questingAgents[inventoryMgmt.agentBeingViewed]?.duration}
            canCompleteQuest={questSystem.questingAgents[inventoryMgmt.agentBeingViewed]?.isComplete || false}
            isEquipped={equippedAgentId === inventoryMgmt.agentBeingViewed}
            onEquip={equipAgent}
            onUnequip={unequipAgent}
            onSendQuest={(tokenId, duration) => questSystem.sendAgentOnQuest(tokenId, duration, inventoryMgmt.fetchInventory)}
            onPreviewRewards={questSystem.previewQuestRewards}
            onListItem={async (tokenId: string, price: string) => {
              await marketplace.listItem(
                tokenId,
                price,
                GAME_ITEM_ADDRESS,
                GameItemABI,
                async () => {
                  await fetchBalance()
                  await inventoryMgmt.fetchInventory()
                  inventoryMgmt.setAgentBeingViewed(null)
                }
              )
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App

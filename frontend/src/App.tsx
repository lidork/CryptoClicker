import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, JsonRpcSigner, Contract, formatEther, parseEther, isAddress, ZeroAddress } from 'ethers'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'
import { AgentsScreen } from './components/AgentsScreen'
import { AgentCreationModal } from './components/AgentCreationModal'
import { AgentDetailsModal } from './components/AgentDetailsModal'
import { GameScreen } from './components/GameScreen'
import { InventoryScreen } from './components/InventoryScreen'
import { ItemDetailsModal } from './components/ItemDetailsModal'
import { LeaderboardModal } from './components/LeaderboardModal'
import { NavigationBar } from './components/NavigationBar'
import { RewardPreviewModal } from './components/RewardPreviewModal'
import { ShopScreen } from './components/ShopScreen'
import { WalletSection } from './components/WalletSection'
import { ClickerTokenABI, GameItemABI } from './abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS, CLICKS_PER_TOKEN, SHOP_ITEMS, AGENT_CLASSES, AGENT_MINT_COST, QUEST_DURATIONS } from './constants'
import type {
  AgentClassConfig,
  AgentDetails,
  InventoryItem,
  ItemHistoryRecord,
  ItemMetadata,
  LeaderboardEntry,
  ShopItem,
  QuestInfo
} from './types'

interface EthereumError {
  reason?: string;
  message?: string;
}

function App() {
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  //debug state
  const [showDebug, setShowDebug] = useState(false);

  
  // Game State
  const [clickCount, setClickCount] = useState(0);
  const [unclaimedClicks, setUnclaimedClicks] = useState(0);
  const [clickMultiplier, setClickMultiplier] = useState(1);
  const [passiveIncome, setPassiveIncome] = useState(0);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'game' | 'shop' | 'agents' | 'inventory'>('game');
  
  // Item Details State
  const [selectedItemHistory, setSelectedItemHistory] = useState<ItemHistoryRecord[]>([]);
  const [selectedItemMetadata, setSelectedItemMetadata] = useState<ItemMetadata | null>(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
  const [purchasingItemUri, setPurchasingItemUri] = useState<string | null>(null);
  const [dynamicPrices, setDynamicPrices] = useState<Record<string, string>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Agent state
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [selectedAgentClass, setSelectedAgentClass] = useState<string | null>(null);
  const [agentSupplies, setAgentSupplies] = useState<Record<string, number>>({});
  const [showAgentCreationModal, setShowAgentCreationModal] = useState(false);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentDetails | null>(null);
  const [agentBeingViewed, setAgentBeingViewed] = useState<string | null>(null);
  
  // Quest & Equip state
  const [equippedAgentId, setEquippedAgentId] = useState<string | null>(null);
  const [questingAgents, setQuestingAgents] = useState<Record<string, QuestInfo>>({});
  
  // Reward preview state
  interface RewardPreview {
    agentId: string;
    tokens: string;
    rarity: string;
    hasLoot: boolean;
    xpGain: string;
  }
  const [rewardPreview, setRewardPreview] = useState<RewardPreview | null>(null);
  const [showRewardPreview, setShowRewardPreview] = useState(false);


  const handleConnect = useCallback((_: BrowserProvider, newSigner: JsonRpcSigner, address: string) => {
    setSigner(newSigner);
    setUserAddress(address);
  }, []);

  const handleDisconnect = useCallback(() => {
    setSigner(null);
    setUserAddress(null);
    setTokenBalance("0");
    setInventory([]);
    setSelectedItemHistory([]);
    setSelectedItemMetadata(null);
    // Reset game session data
    setClickCount(0);
    setUnclaimedClicks(0);
    setClickMultiplier(1);
    setPassiveIncome(0);
  }, []);

  const toggleDebug = () => {
    const code = prompt("Enter Debug Code:");
    if (code === import.meta.env.VITE_DEBUG_CODE) {
      setShowDebug(true);
      toast.success("Debug Mode Activated! 🛠️");
    } else if (code) {
      toast.error("Invalid Code");
    }
  };

  const debugMintTokens = async () => {
    if (!signer || !userAddress) return;
    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);
      const amount = parseEther("500"); // 500 Tokens
      const tx = await tokenContract.ownerMint(userAddress, amount);
      await tx.wait();
      toast.success("Debug: Minted 500 Tokens");
      fetchBalance();
    } catch (e) {
      console.error(e);
      toast.error("Debug Mint Failed (Are you owner?)");
    }
  };

  const debugResetClicks = () => {
      setClickCount(0);
      setUnclaimedClicks(100); // Give enough for 10 tokens
      toast.info("Debug: Clicks Reset & Boosted");
  };

  const debugSendQuickQuest = async () => {
    if (!signer) return;
    
    const agents = inventory.filter(i => i.isAgent && !questingAgents[i.id]);
    if (agents.length === 0) {
      toast.error("No available agents for quest");
      return;
    }

    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
      const tokenId = agents[0].id;
      const tx = await gameItemContract.sendAgentOnQuest(tokenId, QUEST_DURATIONS.DEBUG.seconds);
      await tx.wait();
      toast.success(`Agent #${tokenId} sent on 1-minute quest!`);
      fetchQuestStatuses();
    } catch (e) {
      console.error(e);
      toast.error("Failed to send on quest");
    }
  };

  const getItemStats = (uri: string, strengthVal: number) => {
    const strengthDecimal = strengthVal / 100; // 0.01 to 0.50

    switch (uri) {
      case "ipfs://valid-uri-1": // Sword
        return { multiplier: strengthDecimal, passive: 0 };
      
      case "ipfs://valid-uri-2": // Shield
        return { multiplier: 0, passive: strengthDecimal * 10 };
      
      case "ipfs://valid-uri-3": // Scepter
        return { multiplier: 50, passive: 20 };
      
      // PREPARING FOR PHASE 2:
      // case "ipfs://valid-uri-4": return { ... }
      
      default:
        return { multiplier: 0, passive: 0 };
    }
  };

  const fetchLeaderboard = async () => {
    if (!signer && !window.ethereum) return;

    //replace with signer later
    
    const provider = new BrowserProvider(window.ethereum);
    const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, provider);

    try {
        toast.info("Indexing blockchain events for leaderboard...");
        
        // Fetch EVERYTHING from Block 0
        const filter = tokenContract.filters.Transfer();
        const events = await tokenContract.queryFilter(filter, 0);

        const balances: Record<string, bigint> = {};

        // Replay History
        events.forEach((event) => {
            // @ts-expect-error Ethers args
            const from = event.args[0];
            // @ts-expect-error Ethers args
            const to = event.args[1];
            // @ts-expect-error Ethers args
            const value = event.args[2];

            if (from !== ZeroAddress) {
                balances[from] = (balances[from] || 0n) - value;
            }
            if (to !== ZeroAddress) {
                balances[to] = (balances[to] || 0n) + value;
            }
        });

        const sortedList = Object.entries(balances)
            .map(([addr, bal]) => ({ 
                address: addr, 
                balance: parseFloat(formatEther(bal)) // Keep as number for sorting
            }))
            .sort((a, b) => b.balance - a.balance) // Highest first
            .slice(0, 10) // Top 10
            .map(item => ({ 
                address: item.address, 
                balance: item.balance.toFixed(2) // String for display
            }));

        setLeaderboard(sortedList);
        setShowLeaderboard(true);
    } catch (e) {
        console.error("Leaderboard error:", e);
        toast.error("Could not fetch leaderboard data.");
    }
  };

  const fetchShopPrices = useCallback(async () => {
    if (!signer) return;
    try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        const prices: Record<string, string> = {};

        // Loop through all defined shop items
        for (const item of SHOP_ITEMS) {
            const basePriceWei = parseEther(item.price.toString());
            // Call the contract to get the bonding curve price
            const currentPriceWei = await gameItemContract.getDynamicPrice(item.uri, basePriceWei);
            prices[item.uri] = formatEther(currentPriceWei);
        }
        setDynamicPrices(prices);
    } catch (e) {
        console.warn("Error fetching dynamic prices", e);
    }
  }, [signer]);

  const fetchInventory = useCallback(async () => {
  if (signer && userAddress) {
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
      const filter = gameItemContract.filters.Transfer(null, userAddress);
      const events = await gameItemContract.queryFilter(filter, 0);
      
      console.log(`Found ${events.length} transfer events for ${userAddress}`);
      
      const loadedInventory = await Promise.all(events.map(async (event) => {
        try {
          // @ts-expect-error Ethers v6 args
          const tokenId = event.args[2];
          const owner = await gameItemContract.ownerOf(tokenId);
          
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const uri = await gameItemContract.tokenURI(tokenId);
            
            let nftType;
            try {
              nftType = await gameItemContract.getNftType(tokenId);
            } catch (e) {
              console.warn(`Could not get NFT type for ${tokenId}:`, e);
              nftType = 0; // Default to lootbox if type check fails
            }
            
            const isAgent = Number(nftType) === 1; // AGENT = 1, LOOTBOX = 0
            console.log(`Token ${tokenId}: isAgent=${isAgent}, nftType=${nftType}`);
            
            if (isAgent) {
              // Fetch agent stats
              try {
                const stats = await gameItemContract.getAgentStats(tokenId);
                console.log(`Agent ${tokenId}: class=${stats.agentClass}, level=${stats.level}`);
                
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
                };
              } catch (agentErr) {
                console.error(`Failed to fetch agent ${tokenId} stats:`, agentErr);
                return null;
              }
            } else {
              // Fetch lootbox stats
              try {
                const meta = await gameItemContract.items(tokenId);
                return {
                  id: tokenId.toString(),
                  uri,
                  strength: Number(meta.strength),
                  isAgent: false
                };
              } catch (lootErr) {
                console.error(`Failed to fetch lootbox ${tokenId} stats:`, lootErr);
                return null;
              }
            }
          }
        } catch (err) {
          console.warn("Item fetch error", err);
        }
        return null;
      }));

      const uniqueItemsMap = new Map();
      loadedInventory.forEach(item => {
        if (item) {
          uniqueItemsMap.set(item.id, item);
        }
      });
      
      const inventoryArray = Array.from(uniqueItemsMap.values());
      console.log(`Loaded inventory: ${inventoryArray.length} items total`, inventoryArray);
      setInventory(inventoryArray);
    } catch (e) {
      console.error("Error fetching inventory:", e);
    }
  }
}, [signer, userAddress]);

  const fetchBalance = useCallback(async () => {
    if (signer && userAddress) {
      try {
        const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);
        const balance = await tokenContract.balanceOf(userAddress);
        setTokenBalance(formatEther(balance));
      } catch {
        console.log("Contract not deployed or address incorrect");
      }
      fetchInventory();
    }
  }, [signer, userAddress, fetchInventory]);

  const fetchAgentSupplies = useCallback(async () => {
  if (!signer) return;
  try {
    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
    const supplies: Record<string, number> = {};
    
    for (const agentClass of AGENT_CLASSES) {
      const supply = await gameItemContract.getAgentSupplyByClass(agentClass.name);
      supplies[agentClass.name] = Number(supply);
    }
    
    setAgentSupplies(supplies);
  } catch (e) {
    console.warn("Error fetching agent supplies:", e);
  }
}, [signer]);


//fetch balance and prices
  useEffect(() => {
  if (userAddress) {
    fetchBalance();
    fetchShopPrices();
    fetchAgentSupplies();
  }
}, [userAddress, clickCount, fetchBalance, fetchShopPrices, fetchAgentSupplies]);

  //Listen for account changes in MetaMask and update balance accordingly
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = () => {
        handleDisconnect();
        toast.info("Account changed. Please reconnect your wallet.");
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [handleDisconnect]);

  // Calculate Game Bonuses based on Inventory
  useEffect(() => {
    let newMultiplier = 1;
    let newPassive = 0;

    // Lootbox items
    inventory.forEach(item => {
        if (!item.isAgent) {
          const stats = getItemStats(item.uri, item.strength);
          newMultiplier += stats.multiplier;
          newPassive += stats.passive;
        }
    });

    // Equipped agent bonuses
    if (equippedAgentId && !questingAgents[equippedAgentId]) {
      const agent = inventory.find(i => i.id === equippedAgentId && i.isAgent);
      if (agent && agent.level) {
        const agentBonus = calculateEquippedAgentBonus(agent);
        newMultiplier += agentBonus.clickBonus;
        newPassive += agentBonus.passiveBonus;
      }
    }

    setClickMultiplier(parseFloat(newMultiplier.toFixed(2)));
    setPassiveIncome(parseFloat(newPassive.toFixed(2)));
  }, [inventory, equippedAgentId, questingAgents]);


  // Passive Income Timer
  useEffect(() => {
      if (passiveIncome === 0) return;
      
      const timer = setInterval(() => {
          setUnclaimedClicks(prev => prev + passiveIncome);
      }, 1000);
      
      return () => clearInterval(timer);
  }, [passiveIncome]);

  const handleClick = () => {
    // Check if user has earned a coin but hasn't connected wallet
    if (!userAddress && (unclaimedClicks + 1) >= CLICKS_PER_TOKEN) {
      toast.info("You've earned your first coin! Please connect your wallet to continue earning and claim your rewards.");
      return;
    }
    setClickCount((prev) => prev + 1);
    setUnclaimedClicks((prev) => prev + clickMultiplier);
  };

  const handlePayout = async () => {
    if (!signer || !userAddress) {
        toast.error("Please connect your wallet first.");
        return;
    }

    const potentialTokens = Math.floor(unclaimedClicks / CLICKS_PER_TOKEN);
    if (potentialTokens === 0) {
      toast.info(`You need ${CLICKS_PER_TOKEN} clicks to earn 1 token!`);
      return;
    }

    let tokensToMint = potentialTokens;
    if (tokensToMint > 10) {
        const confirmed = window.confirm(
            `You have earned enough clicks for ${tokensToMint} tokens, but the transaction limit is 10 tokens per batch.\n\nDo you want to payout 10 tokens now?`
        );
        if (!confirmed) return;
        tokensToMint = 10;
    }

    setIsPayoutProcessing(true);

    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);
      // Mint tokensToMint * 1.0 decimals
      console.log(`Attempting to mint ${tokensToMint} tokens...`);
      const amount = parseEther(tokensToMint.toString());
      
      const txPromise = async () => {
          const tx = await tokenContract.mint(userAddress, amount);
          console.log("Payout transaction sent:", tx.hash);
          return await tx.wait();
      };

      await toast.promise(
        txPromise(),
        {
          pending: `Minting ${tokensToMint} tokens...`,
          success: `Successfully minted ${tokensToMint} tokens!`,
          error: 'Transaction failed'
        }
      );
      
      // Deduct the clicks we just paid out for
      setUnclaimedClicks((prev) => prev - (tokensToMint * CLICKS_PER_TOKEN));
      fetchBalance();
    } catch (e: unknown) {
      console.error("Payout failed:", e);
      // Try to extract a readable error message
      let errorMessage = "Transaction failed.";
      if (typeof e === 'object' && e !== null) {
          const err = e as EthereumError;
          if (err.reason) errorMessage = err.reason;
          else if (err.message) errorMessage = err.message;
      }
      
      toast.error(`Payout failed: ${errorMessage}`);
    } finally {
      setIsPayoutProcessing(false);
    }
  };

  const buyShopItem = async (itemUri: string) => {
      if (!signer || !userAddress) {
        toast.error("Connect wallet first!");
        return;
      }
      
      const item = SHOP_ITEMS.find(i => i.uri === itemUri);
      if (!item) return;

      const livePriceStr = dynamicPrices[itemUri] || item.price.toString();
      const livePrice = parseFloat(livePriceStr);
      const currentBalance = parseFloat(tokenBalance);

      if (currentBalance < livePrice) {
        toast.error(`Insufficient funds! Item costs ${livePrice} CLK (Dynamic Price).`);
        return;
      }

      
      try {
        setPurchasingItemUri(itemUri);

        const basePriceWei = parseEther(item.price.toString()); 
        const livePriceWei = parseEther(livePriceStr); 

        const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);
        const allowance = await tokenContract.allowance(userAddress, GAME_ITEM_ADDRESS);



        if (allowance < livePriceWei) {
          toast.info("Please approve the transaction first...");
          // Approve the Shop to spend tokens
          const txApprove = await tokenContract.approve(GAME_ITEM_ADDRESS, livePriceWei);
          await toast.promise(
              txApprove.wait(),
              { pending: "Approving usage of CLK...", success: "Approved!", error: "Approval failed" }
          );
      }

      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);

      const txPromise = async () => {
        const tx = await gameItemContract.mintLootboxItem(userAddress, itemUri, basePriceWei); //internal calculation
          console.log("Mint transaction:", tx.hash);
          return await tx.wait();
       }

          await toast.promise(
            txPromise(),
            {
               pending: `Minting ${item.name}...`,
               success: 'Item Minted!',
               error: 'Minting failed'
            }
          );

        setTokenBalance((prev) => (parseFloat(prev) - item.price).toString()); 
        fetchShopPrices();
        fetchInventory();
        fetchBalance();
      } catch (e: unknown) {
        console.error("Mint failed:", e);
        let msg = "Failed to buy item.";
        if (typeof e === 'object' && e !== null) {
            const err = e as EthereumError;
            if (err.reason) msg += ` Reason: ${err.reason}`;
            else if (err.message) msg += ` Error: ${err.message}`;
        }
        toast.error(msg);
    } finally {
        setPurchasingItemUri(null);
    }
  }

const createAgent = async (agentClass: string) => {
  if (!signer || !userAddress) {
    toast.error("Connect wallet first!");
    return;
  }

  const balance = parseFloat(tokenBalance);
  if (balance < AGENT_MINT_COST) {
    toast.error(`Insufficient funds! Agent costs ${AGENT_MINT_COST} CLK.`);
    return;
  }

  setIsCreatingAgent(true);

  try {
    const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);
    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);

    // Check allowance
    const costWei = parseEther(AGENT_MINT_COST.toString());
    const allowance = await tokenContract.allowance(userAddress, GAME_ITEM_ADDRESS);

    if (allowance < costWei) {
      toast.info("Approving agent creation cost...");
      const txApprove = await tokenContract.approve(GAME_ITEM_ADDRESS, costWei);
      await txApprove.wait();
    }

    // Create agent
    const agentURI = `ipfs://agent-${agentClass.toLowerCase()}`;
    
    const txPromise = async () => {
      const tx = await gameItemContract.mintAgent(userAddress, agentClass, agentURI);
      console.log("Agent creation tx:", tx.hash);
      return await tx.wait();
    };

    await toast.promise(
      txPromise(),
      {
        pending: `Creating ${agentClass} Agent...`,
        success: `${agentClass} Agent created! Your journey begins...`,
        error: "Failed to create agent"
      }
    );

    setSelectedAgentClass(null);
    setShowAgentCreationModal(false);
    
    // Add a small delay to ensure blockchain has processed the transaction
    setTimeout(() => {
      fetchBalance();
      fetchInventory();
      fetchAgentSupplies();
    }, 2000);
  } catch (e: unknown) {
    console.error("Agent creation failed:", e);
    let msg = "Failed to create agent.";
    if (typeof e === 'object' && e !== null) {
      const err = e as EthereumError;
      if (err.reason) msg += ` Reason: ${err.reason}`;
      else if (err.message) msg += ` Error: ${err.message}`;
    }
    toast.error(msg);
  } finally {
    setIsCreatingAgent(false);
  }
};

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
              image: 'https://placehold.co/200x200/png?text=CLK', // Optional placeholder image
            },
          },
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      toast.error("Metamask is not installed!");
    }
  };

  const fetchItemDetails = async (tokenId: string) => {
    if (!signer) return;
    try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        
        let history: ItemHistoryRecord[] = [];
        try {
            const rawHistory = await gameItemContract.getItemHistory(tokenId);
            
            // Map the Ethers Result/Struct array to clean JS objects
            // Ethers v6 returns Proxy objects for structs, so we explicitely read properties
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            history = rawHistory.map((record: any) => ({
                from: record.from,
                to: record.to
            }));
        } catch(e) { console.warn("Could not fetch history", e); }
        setSelectedItemHistory(history);

        //fetching metadata
        let meta = { purchasePrice: 0, mintDate: 0, originalCreator: "Unknown", strength: 0 };
        try {
           meta = await gameItemContract.items(tokenId);
        } catch(e) { console.warn("Could not fetch metadata", e); }

        setSelectedItemMetadata({
            purchasePrice: meta.purchasePrice.toString(),
            mintDate: Number(meta.mintDate) > 0 ? new Date(Number(meta.mintDate) * 1000).toLocaleString() : "Unknown",
            originalCreator: meta.originalCreator,
            strength: (Number(meta.strength) / 100).toFixed(2) // Display readable format
        });
        
        setSelectedTokenId(tokenId);
    } catch (e) {
        console.error("Error fetching item details:", e);
        toast.error("Failed to fetch details. Is the contract deployed?");
    }
  };

  const fetchAgentDetails = async (tokenId: string) => {
  if (!signer) return;
  try {
    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
    
    // Get agent stats
    const agentStats = await gameItemContract.getAgentStats(tokenId);
    
    setSelectedAgentDetails({
      tokenId,
      level: Number(agentStats.level),
      miningRate: Number(agentStats.miningRate),
      creationTime: Number(agentStats.creationTime),
      experience: Number(agentStats.experience),
      strength: Number(agentStats.strength),
      agentClass: agentStats.agentClass,
      xpGainVariance: Number(agentStats.xpGainVariance)
    });
    setAgentBeingViewed(tokenId);

    // Get history (removed - no longer stored on chain)
    const normalizedHistory: ItemHistoryRecord[] = [];
    setSelectedItemHistory(normalizedHistory); // Empty array since getItemHistory removed
  } catch (e) {
    console.error("Error fetching agent details:", e);
    toast.error("Failed to fetch agent details");
  }
};

  const getAgentSkills = (agentClass: string, level: number) => {
  void level;
  const baseSkills: Record<string, string[]> = {
    "Warrior": [
      "⚔️ Cleave: Every 10 levels, gain +5% click multiplier",
      "🛡️ Counter: Passive income provides click boost every 30 seconds",
      "💪 Strength Boost: Base mining rate increases by 1% per level"
    ],
    "Guardian": [
      "🛡️ Fortify: Every 5 levels, gain +10% passive income",
      "🔒 Protect: Bonus XP from transfers (+5 XP per trade)",
      "⚡ Steady: Consistent leveling speed, XP gain variance reduced"
    ],
    "Sorcerer": [
      "🔮 Arcane Power: Every level, gain +2% mining rate",
      "✨ Mana Surge: Every 15 levels unlock a temporary +50% mining boost",
      "🌟 Ancient Knowledge: Learn faster - XP requirements decrease by 2% per level"
    ]
  };

  return baseSkills[agentClass] || [];
};

  const calculateEquippedAgentBonus = (agent: InventoryItem) => {
    if (!agent.level || !agent.agentClass) return { clickBonus: 0, passiveBonus: 0 };
    
    switch (agent.agentClass) {
      case "Warrior":
        return {
          clickBonus: agent.level * 0.05, // +5% per level
          passiveBonus: 0
        };
      case "Guardian":
        return {
          clickBonus: 0,
          passiveBonus: agent.level * 0.1 // +10% per level
        };
      case "Sorcerer":
        return {
          clickBonus: agent.level * 0.02, // +2% per level
          passiveBonus: agent.level * 0.08 // +8% per level
        };
      default:
        return { clickBonus: 0, passiveBonus: 0 };
    }
  };

  const equipAgent = (tokenId: string) => {
    const agent = inventory.find(i => i.id === tokenId && i.isAgent);
    if (!agent) return;
    
    // Can't equip if on quest
    if (questingAgents[tokenId]) {
      toast.error("Cannot equip an agent that is on a quest!");
      return;
    }
    
    setEquippedAgentId(tokenId);
    toast.success(`${agent.agentClass} Agent equipped!`);
  };

  const unequipAgent = () => {
    setEquippedAgentId(null);
    toast.info("Agent unequipped");
  };

  const previewQuestRewards = async (tokenId: string) => {
    if (!signer) return;
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
      const tokenIdBigInt = BigInt(tokenId);
      
      const preview = await gameItemContract.previewQuestRewards(tokenIdBigInt);
      const tokensInCLK = Number(preview.tokens) / 1e18; // Convert from wei
      
      setRewardPreview({
        agentId: tokenId,
        tokens: tokensInCLK.toFixed(2),
        rarity: preview.rarity,
        hasLoot: preview.itemUri.length > 0,
        xpGain: Number(preview.xpGain).toString()
      });
      setShowRewardPreview(true);
    } catch (e) {
      console.error("Failed to preview rewards:", e);
      toast.error("Could not preview rewards");
    }
  };

  const sendAgentOnQuest = async (tokenId: string, questDuration: number) => {
    if (!signer || !userAddress) {
      toast.error("Wallet not connected!");
      return;
    }
    
    // Unequip if this agent is equipped
    if (equippedAgentId === tokenId) {
      setEquippedAgentId(null);
    }
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
      
      // Parse tokenId to BigInt
      const tokenIdBigInt = BigInt(tokenId);
      console.log(`Sending agent ${tokenIdBigInt} on quest for ${questDuration} seconds`);
      
      const txPromise = async () => {
        console.log("Attempting to call sendAgentOnQuest...");
        const tx = await gameItemContract.sendAgentOnQuest(tokenIdBigInt, questDuration);
        console.log("Quest transaction submitted:", tx.hash);
        const receipt = await tx.wait();
        console.log("Quest transaction confirmed:", receipt?.hash);
        return receipt;
      };
      
      await toast.promise(txPromise(), {
        pending: "Sending agent on quest...",
        success: "Agent departed! Safe travels! 🗺️"
      });
      
      // Refetch quest statuses to sync with blockchain
      await fetchQuestStatuses();
      await fetchInventory();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("Quest start failed:", e);
      console.error("Error details:", errorMsg);
      
      // Try to extract the contract error message
      if (errorMsg.includes("Only agents can quest")) {
        toast.error("This isn't an agent! Only agents can go on quests.");
      } else if (errorMsg.includes("Not your agent")) {
        toast.error("You don't own this agent!");
      } else if (errorMsg.includes("Agent already on quest")) {
        toast.error("This agent is already on a quest!");
      } else if (errorMsg.includes("Minimum 1 minute quest")) {
        toast.error("Quest duration must be at least 1 minute!");
      } else {
        toast.error("Failed to send agent on quest");
      }
    }
  };

  const completeQuest = async (tokenId: string) => {
    if (!signer || !userAddress) {
      toast.error("Wallet not connected!");
      return;
    }
    
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
      
      // Parse tokenId to BigInt
      const tokenIdBigInt = BigInt(tokenId);
      console.log(`Completing quest for agent ${tokenIdBigInt}`);
      
      let rewardText = "Agent returned! 🎉";
      
      // Try to preview rewards first
      try {
        const preview = await gameItemContract.previewQuestRewards(tokenIdBigInt);
        const tokensInCLK = Number(preview.tokens) / 1e18;
        rewardText = `🎉 ${preview.rarity} Reward: ${tokensInCLK.toFixed(2)} CLK${preview.itemUri.length > 0 ? ' + Loot Item' : ''}`;
      } catch (e) {
        console.warn("Could not preview rewards, will show basic message" + e);
      }
      
      const txPromise = async () => {
        console.log("Attempting to call completeQuest...");
        const tx = await gameItemContract.completeQuest(tokenIdBigInt);
        console.log("Complete quest transaction submitted:", tx.hash);
        const receipt = await tx.wait();
        console.log("Complete quest transaction confirmed:", receipt?.hash);
        return receipt;
      };
      
      await toast.promise(txPromise(), {
        pending: "Completing quest...",
        success: rewardText,
      });
      
      setShowRewardPreview(false);
      
      // Wait a moment for blockchain to index new items, then refetch
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refetch everything after quest completion
      await fetchInventory();
      await fetchBalance();
      await fetchQuestStatuses();  // Refetch quest statuses to update UI immediately
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("Quest completion failed:", e);
      console.error("Error details:", errorMsg);
      
      if (errorMsg.includes("Agent not on quest")) {
        toast.error("This agent is not on a quest!");
      } else if (errorMsg.includes("Not your quest")) {
        toast.error("You don't own this quest!");
      } else if (errorMsg.includes("Quest not finished")) {
        toast.error("The quest is still in progress!");
      } else {
        toast.error("Failed to complete quest");
      }
    }
  };

  const fetchQuestStatuses = useCallback(async () => {
    if (!signer) return;
    
    const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
    const agents = inventory.filter(i => i.isAgent);
    
    const statuses: Record<string, QuestInfo> = {};
    
    await Promise.all(agents.map(async (agent) => {
      try {
        // Parse tokenId to BigInt
        const tokenIdBigInt = BigInt(agent.id);
        const status = await gameItemContract.getQuestStatus(tokenIdBigInt);
        if (status.isOnQuest) {
          const endTime = Number(status.questEndTime);
          const isComplete = Date.now() / 1000 >= endTime;
          statuses[agent.id] = {
            endTime,
            duration: Number(status.questEndTime) - (Number(status.questEndTime) - Number(status.remainingTime)),
            isComplete
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch quest status for ${agent.id}. Assuming not on quest.`, e);
      }
    }));
    
    setQuestingAgents(statuses);
  }, [signer, inventory]);

  // Fetch quest statuses when inventory changes
  useEffect(() => {
    if (inventory.length > 0 && signer) {
      fetchQuestStatuses();
    }
  }, [inventory.length, signer, fetchQuestStatuses]);

  // Poll quest statuses every 30 seconds
  useEffect(() => {
    if (!signer || inventory.length === 0) return;
    
    const interval = setInterval(() => {
      fetchQuestStatuses();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [signer, inventory.length, fetchQuestStatuses]);

  const transferItem = async () => {
    if (!signer || !userAddress || !selectedTokenId) return;

    if (!transferTarget) {
        toast.warning("Please enter a recipient address.");
        return;
    }

    if (!isAddress(transferTarget)) {
        toast.error("Invalid Ethereum address. Please check the address and try again.");
        return;
    }
    
    try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        
        const txPromise = async () => {
            const tx = await gameItemContract.transferFrom(userAddress, transferTarget, selectedTokenId);
            console.log("Transfer tx:", tx.hash);
            return await tx.wait();
        };

        await toast.promise(
            txPromise(),
            {
                pending: `Transferring item #${selectedTokenId} to ${transferTarget.slice(0, 6)}...`,
                success: 'Item transferred successfully!',
                error: 'Transfer failed'
            }
        );
        
        setTransferTarget("");
        setSelectedTokenId(null); 
        fetchInventory(); 
    } catch (e) {
        console.error("Transfer failed:", e);
        toast.error("Transfer failed. Check console for details.");
    }
  };

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

      <NavigationBar currentScreen={currentScreen} onChange={setCurrentScreen} />

      <div className="game-area">
        {currentScreen === 'game' && (
          <GameScreen
            clickCount={clickCount}
            clickMultiplier={clickMultiplier}
            passiveIncome={passiveIncome}
            unclaimedClicks={unclaimedClicks}
            clicksPerToken={CLICKS_PER_TOKEN}
            isPayoutProcessing={isPayoutProcessing}
            onClick={handleClick}
            onPayout={handlePayout}
          />
        )}

      {showDebug && (
        <div style={{
          position: 'fixed', bottom: '10px', left: '10px', 
          background: 'rgba(50,0,0,0.9)', padding: '15px', 
          border: '1px solid red', borderRadius: '8px', zIndex: 2000,
          maxWidth: '250px'
        }}>
          <h3 style={{margin: '0 0 10px 0', color: 'red'}}>🛠️ Debug Menu</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
             <button onClick={debugMintTokens}>Give 500 Tokens (Owner)</button>
             <button onClick={debugResetClicks}>Set 100 Free Clicks</button>
             <button onClick={debugSendQuickQuest}>Send Agent on 1min Quest</button>
             <button onClick={() => setShowDebug(false)}>Close Menu</button>
          </div>
        </div>
      )}
        {currentScreen === 'shop' && (
          <ShopScreen
            items={SHOP_ITEMS as ShopItem[]}
            dynamicPrices={dynamicPrices}
            tokenBalance={tokenBalance}
            purchasingItemUri={purchasingItemUri}
            onBuy={buyShopItem}
          />
        )}

        {currentScreen === 'agents' && (
          <AgentsScreen
            agentClasses={AGENT_CLASSES as AgentClassConfig[]}
            tokenBalance={tokenBalance}
            agentSupplies={agentSupplies}
            isCreatingAgent={isCreatingAgent}
            selectedAgentClass={selectedAgentClass}
            onOpenCreateModal={(agentClass) => {
              setSelectedAgentClass(agentClass);
              setShowAgentCreationModal(true);
            }}
            agentMintCost={AGENT_MINT_COST}
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            inventory={inventory}
            shopItems={SHOP_ITEMS as ShopItem[]}
            onItemClick={fetchItemDetails}
            onAgentClick={fetchAgentDetails}
          />
        )}

        {showAgentCreationModal && selectedAgentClass && (
          <AgentCreationModal
            selectedAgentClass={selectedAgentClass}
            tokenBalance={tokenBalance}
            isCreatingAgent={isCreatingAgent}
            agentMintCost={AGENT_MINT_COST}
            onConfirm={createAgent}
            onClose={() => setShowAgentCreationModal(false)}
          />
        )}

        {showLeaderboard && (
          <LeaderboardModal
            leaderboard={leaderboard}
            onClose={() => setShowLeaderboard(false)}
          />
        )}

        {showRewardPreview && rewardPreview && (
          <RewardPreviewModal
            agentId={rewardPreview.agentId}
            tokens={rewardPreview.tokens}
            rarity={rewardPreview.rarity}
            hasLoot={rewardPreview.hasLoot}
            xpGain={rewardPreview.xpGain}
            onConfirm={(agentId) => {
              setShowRewardPreview(false);
              completeQuest(agentId);
            }}
            onCancel={() => {
              setShowRewardPreview(false);
              setRewardPreview(null);
            }}
          />
        )}

        {selectedTokenId && !agentBeingViewed && (
          <ItemDetailsModal
            selectedTokenId={selectedTokenId}
            inventory={inventory}
            shopItems={SHOP_ITEMS as ShopItem[]}
            selectedItemMetadata={selectedItemMetadata}
            selectedItemHistory={selectedItemHistory}
            transferTarget={transferTarget}
            userAddress={userAddress}
            onClose={() => setSelectedTokenId(null)}
            onTransferTargetChange={setTransferTarget}
            onTransfer={transferItem}
            getItemStats={getItemStats}
          />
        )}

        {agentBeingViewed && selectedAgentDetails && (
          <AgentDetailsModal
            selectedAgentDetails={selectedAgentDetails}
            selectedItemHistory={selectedItemHistory}
            userAddress={userAddress}
            getAgentSkills={getAgentSkills}
            onClose={() => setAgentBeingViewed(null)}
            isOnQuest={!!questingAgents[agentBeingViewed]}
            questEndTime={questingAgents[agentBeingViewed]?.endTime}
            questDuration={questingAgents[agentBeingViewed]?.duration}
            canCompleteQuest={questingAgents[agentBeingViewed]?.isComplete || false}
            isEquipped={equippedAgentId === agentBeingViewed}
            onEquip={equipAgent}
            onUnequip={unequipAgent}
            onSendQuest={sendAgentOnQuest}
            onPreviewRewards={previewQuestRewards}
          />
        )}
      </div>
    </div>
  )
}

export default App

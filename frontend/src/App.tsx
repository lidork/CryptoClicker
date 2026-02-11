import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, JsonRpcSigner, Contract, formatEther, parseEther, isAddress } from 'ethers'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'
import { WalletConnect } from './components/WalletConnect'
import { ClickerTokenABI, GameItemABI } from './abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS, CLICKS_PER_TOKEN, SHOP_ITEMS } from './constants'

interface ItemHistoryRecord {
  from: string;
  to: string;
}

interface ItemMetadata {
  purchasePrice: string;
  mintDate: string;
  originalCreator: string;
  strength: string;
}

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
  const [inventory, setInventory] = useState<{id: string, uri: string, strength: number}[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'game' | 'shop' | 'inventory'>('game');
  
  // Item Details State
  const [selectedItemHistory, setSelectedItemHistory] = useState<ItemHistoryRecord[]>([]);
  const [selectedItemMetadata, setSelectedItemMetadata] = useState<ItemMetadata | null>(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
  const [purchasingItemUri, setPurchasingItemUri] = useState<string | null>(null);

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
      const amount = parseEther("100"); // 100 Tokens
      const tx = await tokenContract.mint(userAddress, amount);
      await tx.wait();
      toast.success("Debug: Minted 100 Tokens");
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

  const fetchInventory = useCallback(async () => {
    if (signer && userAddress) {
       try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        const filter = gameItemContract.filters.Transfer(null, userAddress);
        const events = await gameItemContract.queryFilter(filter, 0);
        
        const loadedInventory = await Promise.all(events.map(async (event) => {
          try {
          // @ts-expect-error Ethers v6 args
          const tokenId = event.args[2]; 
          const owner = await gameItemContract.ownerOf(tokenId);
          
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
               const uri = await gameItemContract.tokenURI(tokenId);
               // Fetch the metadata struct to get the specific strength of this item
               const meta = await gameItemContract.items(tokenId);

               const strengthVal = meta.strength ? Number(meta.strength) : 1;

               return { 
                 id: tokenId.toString(), 
                 uri, 
                 strength:strengthVal
               };
          }
        } catch (err) {
          // Token might have been burned or errored
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
        
        setInventory(Array.from(uniqueItemsMap.values()));
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

  // Fetch balance on initial load and whenever userAddress or clickCount changes (to reflect new earnings)
  useEffect(() => {
    if (userAddress) {
      fetchBalance();
    }
  }, [userAddress, clickCount, fetchBalance]);

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

    inventory.forEach(item => {
        const stats = getItemStats(item.uri, item.strength);
        newMultiplier += stats.multiplier;
        newPassive += stats.passive;
    });

    setClickMultiplier(parseFloat(newMultiplier.toFixed(2)));
    setPassiveIncome(parseFloat(newPassive.toFixed(2)));
  }, [inventory]);


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

      //todo: doesn't show up, fix
      const currentBalance = parseFloat(tokenBalance);
      if (currentBalance < item.price) {
        toast.error(`Insufficient funds! You have ${tokenBalance} CLK but need ${item.price} CLK.`);
        return;
      }

      
      try {
        setPurchasingItemUri(itemUri);
        const priceWei = parseEther(item.price.toString());

        const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);

        const allowance = await tokenContract.allowance(userAddress, GAME_ITEM_ADDRESS);



        if (allowance < priceWei) {
          toast.info("Please approve the transaction first...");
          // 2. Approve the Shop to spend tokens
          const txApprove = await tokenContract.approve(GAME_ITEM_ADDRESS, priceWei);
          await toast.promise(
              txApprove.wait(),
              { pending: "Approving usage of CLK...", success: "Approved!", error: "Approval failed" }
          );
      }

      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);

      const txPromise = async () => {
        // Pass priceWei to the new contract function
        const tx = await gameItemContract.mintItem(userAddress, itemUri, priceWei);
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
      <h1>Crypto Clicker</h1>

      <h1 onClick={toggleDebug} style={{cursor: 'pointer'}} title="Click for Admin">Crypto Clicker</h1>
      
      <div className="wallet-section">
        <WalletConnect onConnect={handleConnect} onDisconnect={handleDisconnect} />
        {userAddress && <p>Address: {userAddress}</p>}
        {userAddress && <p>Token Balance: {tokenBalance} CLK</p>}
        {userAddress && (
          <button onClick={addToWallet} style={{ fontSize: '0.8em', padding: '5px 10px', marginTop: '5px' }}>
            🦊 Add CLK to Wallet
          </button>
        )}
      </div>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
        <button 
          onClick={() => setCurrentScreen('game')}
          style={{ backgroundColor: currentScreen === 'game' ? '#646cff' : '#1a1a1a' }}
        >
          🎮 Play
        </button>
        <button 
          onClick={() => setCurrentScreen('shop')}
          style={{ backgroundColor: currentScreen === 'shop' ? '#646cff' : '#1a1a1a' }}
        >
          🛒 Shop
        </button>
        <button 
          onClick={() => setCurrentScreen('inventory')}
          style={{ backgroundColor: currentScreen === 'inventory' ? '#646cff' : '#1a1a1a' }}
        >
          🎒 Inventory
        </button>
      </nav>

      <div className="game-area">
        {currentScreen === 'game' && (
          <div className="card">
            <button onClick={handleClick} style={{ fontSize: '2em', padding: '20px' }}>
              Click Me!
            </button>
            <p>
              Clicks (Session): {parseFloat(clickCount.toFixed(3))}
            </p>
            <p>
              Multipler: x{clickMultiplier} {passiveIncome > 0 && `| Passive: +${passiveIncome}/sec`}
            </p>
            <p>
              Unclaimed Clicks: {parseFloat(unclaimedClicks.toFixed(3))} / {CLICKS_PER_TOKEN} for next coin
            </p>
            <button 
              onClick={handlePayout} 
              disabled={unclaimedClicks < CLICKS_PER_TOKEN || isPayoutProcessing}
              style={{ marginTop: '10px' }}
            >
              {isPayoutProcessing ? "Processing..." : `Payout ${Math.floor(unclaimedClicks / CLICKS_PER_TOKEN)} Tokens`}
            </button>
          </div>
        )}

      {showDebug && (
        <div style={{
          position: 'fixed', bottom: '10px', left: '10px', 
          background: 'rgba(50,0,0,0.9)', padding: '15px', 
          border: '1px solid red', borderRadius: '8px', zIndex: 2000
        }}>
          <h3 style={{margin: '0 0 10px 0', color: 'red'}}>🛠️ Debug Menu</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
             <button onClick={debugMintTokens}>Give 100 Tokens (Owner Only)</button>
             <button onClick={debugResetClicks}>Set 100 Free Clicks</button>
             <button onClick={() => setShowDebug(false)}>Close Menu</button>
          </div>
        </div>
      )}

        {currentScreen === 'shop' && (
          <div className="shop-section" style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
              <h2>Shop / Mint NFTs</h2>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {SHOP_ITEMS.map((item, idx) => {
                      const canAfford = parseFloat(tokenBalance) >= item.price;
                      const isBuyingThis = purchasingItemUri === item.uri;
                      
                      return (
                        <div key={idx} className="card" style={{ width: '200px', opacity: canAfford ? 1 : 0.7 }}>
                            <h3>{item.name}</h3>
                            <p>{item.description}</p>
                            <p style={{ color: canAfford ? 'inherit' : '#ff4444' }}>
                                Cost: {item.price} CLK
                            </p>
                            <button 
                                onClick={() => buyShopItem(item.uri)}
                                disabled={!canAfford || purchasingItemUri !== null}
                                style={{ 
                                    cursor: canAfford ? 'pointer' : 'not-allowed',
                                    backgroundColor: isBuyingThis ? '#999' : (canAfford ? '' : '#444')
                                }}
                            >
                                {isBuyingThis ? "Processing..." : (canAfford ? "Buy Item" : "Insufficient Funds")}
                            </button>
                        </div>
                      );
                  })}
              </div>
          </div>
        )}

        {currentScreen === 'inventory' && (
          <div className="inventory-section" style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
              <h2>My Inventory</h2>
              
              {/* Item Details Modal / View */}
              {selectedTokenId && (
                <>
                  <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex: 999}} onClick={() => setSelectedTokenId(null)} />
                  <div className="item-details" style={{ 
                      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                      zIndex: 1000, background: '#2a2a2a', border: '2px solid #646cff', padding: '20px', 
                      borderRadius: '12px', minWidth: '320px', maxWidth: '90%', boxShadow: '0 0 20px rgba(0,0,0,0.8)'
                  }}>
                      {(() => {
                        const invItem = inventory.find(i => i.id === selectedTokenId);
                        const shopItem = invItem ? SHOP_ITEMS.find(s => s.uri === invItem.uri) : null;
                        if (shopItem) {
                            return (
                                <div style={{ marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                                    <h2 style={{ margin: '0 0 5px 0' }}>{shopItem.name}</h2>
                                    <p style={{ margin: 0, color: '#888', fontStyle: 'italic' }}>{shopItem.description}</p>
                                </div>
                            );
                        }
                        return null;
                      })()}
                      <h3>Details for Item #{selectedTokenId}</h3>
                      <button onClick={() => setSelectedTokenId(null)} style={{position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: '1px solid #555', fontSize: '0.8em'}}>✕</button>
                      
                      {selectedItemMetadata && (
                          <div style={{textAlign: 'left', marginBottom: '15px', padding: '10px', background: '#333', borderRadius: '4px'}}>
                              <p style={{margin: '5px 0'}}><strong>Mint Date:</strong> {selectedItemMetadata.mintDate}</p>
                              <p style={{margin: '5px 0'}}><strong>Creator:</strong> {selectedItemMetadata.originalCreator === userAddress ? <span style={{color: 'lime'}}>You</span> : selectedItemMetadata.originalCreator.slice(0,8)+'...'}</p>
                          </div>
                      )}

                      <div style={{textAlign: 'left', maxHeight: '150px', overflowY: 'auto', background: '#111', padding: '10px', borderRadius: '4px', marginBottom: '15px'}}>
                          <h4 style={{marginTop: 0}}>Ownership History</h4>
                          {selectedItemHistory.length === 0 ? <p style={{color: '#666', fontStyle: 'italic'}}>No history recorded.</p> : 
                            selectedItemHistory.map((record, i) => (
                              <p key={i} style={{fontSize: '0.8em', margin: '5px 0', borderBottom: '1px solid #222', paddingBottom: '2px'}}>
                                  <span style={{color: '#aaa'}}>From:</span> {record.from === '0x0000000000000000000000000000000000000000' ? 'Mint' : record.from.slice(0,6)+'...'} <br/>
                                  <span style={{color: '#aaa'}}>To:</span> {record.to.toLowerCase() === userAddress?.toLowerCase() ? <span style={{color: 'lime'}}>You</span> : record.to.slice(0,6)+'...'} 
                              </p>
                          ))}
                      </div>

                      <div style={{marginTop: '15px', borderTop: '1px solid #555', paddingTop: '15px'}}>
                          <h4 style={{marginTop: 0}}>Transfer Item</h4>
                          <div style={{display: 'flex', gap: '5px'}}>
                            <input 
                                type="text" 
                                placeholder="Recipient Address (0x...)" 
                                value={transferTarget}
                                onChange={(e) => setTransferTarget(e.target.value)}
                                style={{flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white'}}
                            />
                            <button onClick={transferItem} style={{background: '#646cff'}}>Send</button>
                          </div>
                      </div>
                  </div>
                </>
              )}

              {inventory.length === 0 ? <p>No items owned.</p> : (
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {inventory.map((item) => {
                          const itemDetails = SHOP_ITEMS.find(s => s.uri === item.uri);
                          
                          // Calculate color based on rarity/strength
                          // 1-20: Gray (Common), 21-40: Blue (Rare), 41-50: Gold (Legendary)
                          let borderColor = '#444';
                          if (item.strength > 40) borderColor = 'gold';
                          else if (item.strength > 20) borderColor = '#4facfe';

                          return (
                            <div key={item.id} className="card" 
                                style={{ 
                                  width: '160px', 
                                  cursor: 'pointer', 
                                  border: `2px solid ${borderColor}`, // Show rarity border
                                  transition: 'all 0.2s', 
                                  padding: '15px',
                                  position: 'relative'
                                }} 
                                onClick={() => fetchItemDetails(item.id)}
                            >
                                {/* Show Strength Badge */}
                                <div style={{
                                  position: 'absolute', top: '5px', right: '5px', 
                                  fontSize: '0.7em', background: '#333', padding: '2px 5px', borderRadius: '4px',
                                  color: borderColor
                                }}>
                                  Quality: {item.strength}/50
                                </div>

                                <div style={{fontSize: '2em', marginBottom: '10px', marginTop: '10px'}}>⚔️</div>
                                <p style={{margin: '5px 0'}}><strong>{itemDetails?.name || `Item #${item.id}`}</strong></p>

                                <button style={{marginTop: '10px', width: '100%', fontSize: '0.8em'}}>View Details</button>
                            </div>
                          );
                      })}
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App

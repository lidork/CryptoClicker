import { useState, useEffect } from 'react'
import { BrowserProvider, JsonRpcSigner, Contract, formatEther, parseEther } from 'ethers'
import './App.css'
import { WalletConnect } from './components/WalletConnect'
import { ClickerTokenABI, GameItemABI } from './abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS, CLICKS_PER_TOKEN, SHOP_ITEMS } from './constants'

function App() {
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  
  // Game State
  const [clickCount, setClickCount] = useState(0);
  const [unclaimedClicks, setUnclaimedClicks] = useState(0);
  const [clickMultiplier, setClickMultiplier] = useState(1);
  const [passiveIncome, setPassiveIncome] = useState(0);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [inventory, setInventory] = useState<{id: string, uri: string}[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'game' | 'shop' | 'inventory'>('game');
  
  // Item Details State
  const [selectedItemHistory, setSelectedItemHistory] = useState<any[]>([]);
  const [selectedItemMetadata, setSelectedItemMetadata] = useState<any>(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);

  const handleConnect = (_: BrowserProvider, newSigner: JsonRpcSigner, address: string) => {
    setSigner(newSigner);
    setUserAddress(address);
  };

  const fetchInventory = async () => {
    if (signer && userAddress) {
       try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        // Find all "Transfer" events where the "to" address is the user
        const filter = gameItemContract.filters.Transfer(null, userAddress);
        const events = await gameItemContract.queryFilter(filter);
        
        const loadedInventory = await Promise.all(events.map(async (event: any) => {
            const tokenId = event.args[2]; // 3rd argument is tokenId
            // Double check owner (in case they transferred it away)
            const owner = await gameItemContract.ownerOf(tokenId);
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
                 const uri = await gameItemContract.tokenURI(tokenId);
                 return { id: tokenId.toString(), uri };
            }
            return null;
        }));
        
        setInventory(loadedInventory.filter(item => item !== null) as {id: string, uri: string}[]);
       } catch (e) {
           console.error("Error fetching inventory:", e);
       }
    }
  }

  const fetchBalance = async () => {
    if (signer && userAddress) {
      // NOTE: This will fail until you deploy contracts and update the address in constants.ts
      try {
        const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer);
        const balance = await tokenContract.balanceOf(userAddress);
        setTokenBalance(formatEther(balance));
      } catch (e) {
        console.log("Contract not deployed or address incorrect");
      }
      fetchInventory();
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchBalance();
    }
  }, [userAddress, clickCount]);

  // Calculate Game Bonuses based on Inventory
  useEffect(() => {
      let newMultiplier = 1;
      let newPassive = 0;

      // Check for specific items by their URI (as defined in SHOP_ITEMS)
      const hasSword = inventory.some(item => item.uri === "ipfs://valid-uri-1"); // Sword of Clicking
      const hasShield = inventory.some(item => item.uri === "ipfs://valid-uri-2"); // Shield of Holding
      const hasCrown = inventory.some(item => item.uri === "ipfs://valid-uri-3"); // Crown

      if (hasSword) newMultiplier += 1;
      if (hasCrown) newMultiplier += 100;

      if (hasShield) newPassive += 1; // 1 click per second

      setClickMultiplier(newMultiplier);
      setPassiveIncome(newPassive);
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
      alert("You've earned your first coin! Please connect your wallet to continue earning and claim your rewards.");
      return;
    }
    setClickCount((prev) => prev + 1);
    setUnclaimedClicks((prev) => prev + clickMultiplier);
  };

  const handlePayout = async () => {
    if (!signer || !userAddress) {
        alert("Please connect your wallet first.");
        return;
    }

    const potentialTokens = Math.floor(unclaimedClicks / CLICKS_PER_TOKEN);
    if (potentialTokens === 0) {
      alert(`You need ${CLICKS_PER_TOKEN} clicks to earn 1 token!`);
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
      
      const tx = await tokenContract.mint(userAddress, amount);
      console.log("Payout transaction sent:", tx.hash);
      
      await tx.wait();
      
      // Deduct the clicks we just paid out for
      setUnclaimedClicks((prev) => prev - (tokensToMint * CLICKS_PER_TOKEN));
      fetchBalance();
      alert(`Successfully minted ${tokensToMint} tokens!`);
    } catch (e: any) {
      console.error("Payout failed:", e);
      // Try to extract a readable error message
      let errorMessage = "Transaction failed.";
      if (e.reason) errorMessage = e.reason;
      else if (e.message) errorMessage = e.message;
      
      alert(`Payout failed: ${errorMessage}`);
    } finally {
      setIsPayoutProcessing(false);
    }
  };

  const buyShopItem = async (itemUri: string) => {
      if (!signer || !userAddress) return alert("Connect wallet first!");
      
      try {
          const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
          const tx = await gameItemContract.mintItem(userAddress, itemUri);
          console.log("Mint transaction:", tx.hash);
          await tx.wait();
          alert("Item Minted!");
          fetchInventory();
      } catch (e) {
          console.error("Mint failed:", e);
          alert("Failed to buy item (Note: Currently only Owner can mint items in this version).");
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
      alert("Metamask is not installed!");
    }
  };

  const fetchItemDetails = async (tokenId: string) => {
    if (!signer) return;
    try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        
        // Try fetching history, default to empty array if fails (backward compatibility)
        let history = [];
        try {
            history = await gameItemContract.getItemHistory(tokenId);
        } catch(e) { console.warn("Could not fetch history", e); }
        setSelectedItemHistory(history);

        // Try fetching metadata
        let meta = { purchasePrice: 0, mintDate: 0, originalCreator: "Unknown" };
        try {
           meta = await gameItemContract.items(tokenId);
        } catch(e) { console.warn("Could not fetch metadata", e); }

        setSelectedItemMetadata({
            purchasePrice: meta.purchasePrice.toString(),
            mintDate: Number(meta.mintDate) > 0 ? new Date(Number(meta.mintDate) * 1000).toLocaleString() : "Unknown",
            originalCreator: meta.originalCreator
        });
        
        setSelectedTokenId(tokenId);
    } catch (e) {
        console.error("Error fetching item details:", e);
        alert("Failed to fetch details. Is the contract deployed?");
    }
  };

  const transferItem = async () => {
    if (!signer || !userAddress || !selectedTokenId || !transferTarget) return;
    
    try {
        const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer);
        const tx = await gameItemContract.transferFrom(userAddress, transferTarget, selectedTokenId);
        console.log("Transfer tx:", tx.hash);
        await tx.wait();
        
        alert("Item transferred successfully!");
        setTransferTarget("");
        setSelectedTokenId(null); // Close detail view
        fetchInventory(); // Refresh list
    } catch (e) {
        console.error("Transfer failed:", e);
        alert("Transfer failed. Check console.");
    }
  };

  return (
    <div className="app-container">
      <h1>Crypto Clicker</h1>
      
      <div className="wallet-section">
        <WalletConnect onConnect={handleConnect} />
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
              🖱️ Click Me!
            </button>
            <p>
              Clicks (Session): {clickCount}
            </p>
            <p>
              Multipler: x{clickMultiplier} {passiveIncome > 0 && `| Passive: +${passiveIncome}/sec`}
            </p>
            <p>
              Unclaimed Clicks: {unclaimedClicks} / {CLICKS_PER_TOKEN} for next coin
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

        {currentScreen === 'shop' && (
          <div className="shop-section" style={{ marginTop: '2rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
              <h2>Shop / Mint NFTs</h2>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {SHOP_ITEMS.map((item, idx) => (
                      <div key={idx} className="card" style={{ width: '200px' }}>
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                          <p>Cost: {item.price} CLK</p>
                          <button onClick={() => buyShopItem(item.uri)}>Mint (Debug)</button>
                      </div>
                  ))}
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
                            selectedItemHistory.map((record: any, i: number) => (
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
                      {inventory.map((item) => (
                          <div key={item.id} className="card" 
                               style={{ width: '160px', cursor: 'pointer', border: '1px solid #444', transition: 'all 0.2s', padding: '15px' }} 
                               onClick={() => fetchItemDetails(item.id)}
                               onMouseOver={(e) => e.currentTarget.style.borderColor = '#646cff'}
                               onMouseOut={(e) => e.currentTarget.style.borderColor = '#444'}
                          >
                              <div style={{fontSize: '2em', marginBottom: '10px'}}>⚔️</div>
                              <p style={{margin: '5px 0'}}><strong>Item #{item.id}</strong></p>
                              <button style={{marginTop: '10px', width: '100%', fontSize: '0.8em'}}>View Details</button>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App

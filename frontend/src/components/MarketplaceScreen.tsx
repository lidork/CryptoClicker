import { useEffect, useState } from 'react'
import { JsonRpcSigner } from 'ethers'
import { toast } from 'react-toastify'
import type { MarketplaceListing, InventoryItem } from '../types'
import { useMarketplace } from '../hooks/useMarketplace'
import { SHOP_ITEMS } from '../constants'

interface MarketplaceScreenProps {
  signer: JsonRpcSigner | null;
  userAddress: string | null;
  inventory: InventoryItem[];
  tokenBalance: string;
  onRefreshInventory: () => Promise<void>;
  onRefreshBalance: () => Promise<void>;
}

export function MarketplaceScreen({
  signer,
  userAddress,
  tokenBalance,
  onRefreshInventory,
  onRefreshBalance
}: MarketplaceScreenProps) {
  const marketplace = useMarketplace(signer, userAddress)
  const [selectedTab, setSelectedTab] = useState<'browse' | 'mylistings'>('browse')

  // Helper to get item name from URI
  const getItemName = (item: InventoryItem): string => {
    if (item.isAgent) {
      return `${item.agentClass} Agent (Level ${item.level})`
    }
    const shopItem = SHOP_ITEMS.find(s => s.uri === item.uri)
    return shopItem ? shopItem.name : `Item #${item.id}`
  }

  useEffect(() => {
    if (signer && userAddress) {
      marketplace.fetchAllListings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, userAddress])

  useEffect(() => {
    if (selectedTab === 'mylistings' && signer && userAddress) {
      marketplace.fetchUserListings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, signer, userAddress])

  const handlePurchaseItem = async (listing: MarketplaceListing) => {
    const currentBalance = parseFloat(tokenBalance)
    const listingPrice = parseFloat(listing.price)

    if (currentBalance < listingPrice) {
      toast.error(`Insufficient CLK! Need ${listingPrice} CLK`)
      return
    }

    try {
      await marketplace.purchaseItem(
        listing.id,
        listing.price,
        async () => {
          await onRefreshBalance()
          await onRefreshInventory()
          await marketplace.fetchAllListings()
        }
      )
    } catch (e) {
      console.error("Purchase error:", e)
    }
  }

  const handleCancelListing = async (listingId: string) => {
    try {
      await marketplace.cancelListing(
        listingId,
        async () => {
          await onRefreshInventory()
          await marketplace.fetchUserListings()
          await marketplace.fetchAllListings()
        }
      )
    } catch (e) {
      console.error("Cancel error:", e)
    }
  }

  const renderListingCard = (listing: MarketplaceListing, isOwnListing: boolean = false) => (
    <div key={listing.id} style={styles.listingCard}>
      <div style={styles.itemImage}>
        {listing.itemDetails.isAgent ? '👥' : '🎁'}
      </div>
      <div style={styles.listingInfo}>
        <h4 style={styles.itemName}>
          {getItemName(listing.itemDetails)}
        </h4>
        <p style={styles.sellerInfo}>
          Seller: <code style={styles.address}>{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</code>
        </p>
        <p style={styles.priceInfo}>
          <strong>Price: {listing.price} CLK</strong>
        </p>
        <p style={styles.timestamp}>
          Listed: {new Date(listing.listedAt * 1000).toLocaleDateString()}
        </p>
      </div>
      {isOwnListing ? (
        <button
          onClick={() => handleCancelListing(listing.id)}
          style={styles.cancelButton}
        >
          ✕ Cancel
        </button>
      ) : (
        <button
          onClick={() => handlePurchaseItem(listing)}
          disabled={parseFloat(tokenBalance) < parseFloat(listing.price)}
          style={{
            ...styles.buyButton,
            opacity: parseFloat(tokenBalance) < parseFloat(listing.price) ? 0.5 : 1,
            cursor: parseFloat(tokenBalance) < parseFloat(listing.price) ? 'not-allowed' : 'pointer'
          }}
        >
          💰 Buy
        </button>
      )}
    </div>
  )

  return (
    <div style={styles.container}>
      <h2>🛍️ Marketplace</h2>
      
      <div style={styles.tabButtons}>
        <button
          onClick={() => setSelectedTab('browse')}
          style={{
            ...styles.tabButton,
            backgroundColor: selectedTab === 'browse' ? '#646cff' : '#1a1a1a'
          }}
        >
          Browse Listings
        </button>
        <button
          onClick={() => setSelectedTab('mylistings')}
          style={{
            ...styles.tabButton,
            backgroundColor: selectedTab === 'mylistings' ? '#646cff' : '#1a1a1a'
          }}
        >
          My Listings
        </button>
      </div>

      {selectedTab === 'browse' && (
        <div>
          <h3>Available Listings ({marketplace.listings.length})</h3>
          {marketplace.isLoading ? (
            <p>Loading listings...</p>
          ) : marketplace.listings.length === 0 ? (
            <p style={styles.emptyMessage}>No items listed yet</p>
          ) : (
            <div style={styles.listingsGrid}>
              {marketplace.listings.map(listing => renderListingCard(listing, false))}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'mylistings' && (
        <div>
          <h3>My Active Listings ({marketplace.userListings.length})</h3>
          {marketplace.userListings.length > 0 ? (
            <div style={styles.listingsGrid}>
              {marketplace.userListings.map(listing => renderListingCard(listing, true))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyMessage}>You have no active listings</p>
              <p style={styles.emptyHint}>💡 Tip: Go to Inventory and click on an item to list it for sale</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  tabButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px'
  },
  tabButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '16px',
    transition: 'background-color 0.2s'
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  listingCard: {
    border: '2px solid #444',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px'
  },
  itemImage: {
    fontSize: '48px',
    textAlign: 'center' as const,
    padding: '10px'
  },
  listingInfo: {
    flex: 1
  },
  itemName: {
    margin: '0 0 8px 0',
    color: '#fff'
  },
  sellerInfo: {
    margin: '5px 0',
    fontSize: '14px',
    color: '#bbb'
  },
  address: {
    backgroundColor: '#333',
    padding: '2px 6px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  priceInfo: {
    margin: '8px 0',
    fontSize: '16px',
    color: '#4fc3f7'
  },
  timestamp: {
    margin: '5px 0',
    fontSize: '12px',
    color: '#999'
  },
  buyButton: {
    padding: '10px 15px',
    backgroundColor: '#4fc3f7',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    transition: 'background-color 0.2s'
  },
  cancelButton: {
    padding: '10px 15px',
    backgroundColor: '#ff7043',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    transition: 'background-color 0.2s'
  },
  emptyMessage: {
    color: '#999',
    fontStyle: 'italic',
    padding: '20px',
    textAlign: 'center' as const,
    margin: 0
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px'
  },
  emptyHint: {
    color: '#7dd3fc',
    fontSize: '14px',
    marginTop: '10px'
  }
}

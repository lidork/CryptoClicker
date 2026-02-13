import type { ShopItem } from '../types';

interface ShopScreenProps {
  items: ShopItem[];
  dynamicPrices: Record<string, string>;
  tokenBalance: string;
  purchasingItemUri: string | null;
  onBuy: (itemUri: string) => void;
}

export function ShopScreen({
  items,
  dynamicPrices,
  tokenBalance,
  purchasingItemUri,
  onBuy
}: ShopScreenProps) {
  return (
    <div className="shop-section">
      <h2>🛒 Shop - Lootbox Items</h2>
      <p style={{ color: '#aaa', marginBottom: '15px' }}>
        Each item has <strong>randomized strength (1-50)</strong> affecting its power. All bonuses stack! Prices increase with demand.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {items.map((item, idx) => {
          const livePrice = dynamicPrices[item.uri] ? dynamicPrices[item.uri] : item.price.toString();
          const canAfford = parseFloat(tokenBalance) >= parseFloat(livePrice);
          const isBuyingThis = purchasingItemUri === item.uri;
          const isAnyPurchasing = purchasingItemUri !== null;  // Disable ALL buttons if ANY item is being purchased

          return (
            <div key={idx} className="card" style={{ width: '220px', opacity: canAfford ? 1 : 0.7 }}>
              <h3>{item.name}</h3>
              <p style={{ minHeight: '60px', fontSize: '0.85em', color: '#ccc', lineHeight: '1.4' }}>{item.description}</p>
              <div style={{ fontSize: '3em', margin: '10px 0' }}>📦</div>

              <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px', marginBottom: '10px', fontSize: '0.8em' }}>
                <p style={{ margin: '3px 0', color: '#fbbf24' }}>🎲 Random Strength: 1-50</p>
              </div>

              <p>Price: <strong>{livePrice} CLK</strong></p>
              {livePrice !== item.price.toString() && <small style={{ color: 'orange' }}>(Demand pricing! 🚀)</small>}

              <button onClick={() => onBuy(item.uri)} disabled={!canAfford || isAnyPurchasing}>
                {isBuyingThis ? "Purchasing..." : isAnyPurchasing ? "Wait..." : "Buy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

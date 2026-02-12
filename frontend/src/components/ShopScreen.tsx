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
      <p>Consumable items with fixed stats. Prices increase with demand!</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {items.map((item, idx) => {
          const livePrice = dynamicPrices[item.uri] ? dynamicPrices[item.uri] : item.price.toString();
          const canAfford = parseFloat(tokenBalance) >= parseFloat(livePrice);
          const isBuyingThis = purchasingItemUri === item.uri;

          return (
            <div key={idx} className="card" style={{ width: '200px', opacity: canAfford ? 1 : 0.7 }}>
              <h3>{item.name}</h3>
              <p style={{ minHeight: '40px', fontSize: '0.9em', color: '#ccc' }}>{item.description}</p>
              <div style={{ fontSize: '3em', margin: '10px 0' }}>📦</div>

              <p>Price: <strong>{livePrice} CLK</strong></p>
              {livePrice !== item.price.toString() && <small style={{ color: 'orange' }}>(Increased by demand! 🚀)</small>}

              <button onClick={() => onBuy(item.uri)} disabled={!canAfford || isBuyingThis}>
                {isBuyingThis ? "Purchasing..." : "Buy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

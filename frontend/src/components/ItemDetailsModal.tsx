import type { InventoryItem, ItemHistoryRecord, ItemMetadata, ShopItem } from '../types';

interface ItemDetailsModalProps {
  selectedTokenId: string;
  inventory: InventoryItem[];
  shopItems: ShopItem[];
  selectedItemMetadata: ItemMetadata | null;
  selectedItemHistory: ItemHistoryRecord[];
  transferTarget: string;
  userAddress: string | null;
  onClose: () => void;
  onTransferTargetChange: (value: string) => void;
  onTransfer: () => void;
  getItemStats: (uri: string, strengthVal: number) => { multiplier: number; passive: number };
}

export function ItemDetailsModal({
  selectedTokenId,
  inventory,
  shopItems,
  selectedItemMetadata,
  selectedItemHistory,
  transferTarget,
  userAddress,
  onClose,
  onTransferTargetChange,
  onTransfer,
  getItemStats
}: ItemDetailsModalProps) {
  const invItem = inventory.find(i => i.id === selectedTokenId);
  const shopItem = invItem ? shopItems.find(s => s.uri === invItem.uri) : null;

  let exactStats: string | null = null;
  if (invItem) {
    const stats = getItemStats(invItem.uri, invItem.strength);
    const parts = [] as string[];
    if (stats.multiplier > 0) parts.push(`+${stats.multiplier.toFixed(2)} Click Multiplier`);
    if (stats.passive > 0) parts.push(`+${stats.passive.toFixed(2)}/sec Passive`);
    exactStats = parts.join(' & ');
  }

  return (
    <>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }}
        onClick={onClose}
      />
      <div className="modal-content" style={{ zIndex: 1000, maxWidth: '600px' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#646cff' }}>
          {shopItem?.name || `Item #${selectedTokenId}`}
        </h2>

        {shopItem && (
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <p style={{ margin: '0.5rem 0', color: '#aaa' }}>
              <strong>Description:</strong> {shopItem.description}
            </p>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #646cff' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>Item Quality</p>
            <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#7dd3fc' }}>
              {invItem ? `${invItem.strength}/50` : '0/50'}
            </p>
          </div>

          <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>Item Effects</p>
            <p style={{ margin: 0, fontSize: '0.95em', fontWeight: 'bold', color: '#7dd3fc' }}>
              {exactStats ? `⚡ ${exactStats}` : 'None'}
            </p>
          </div>
        </div>

        {selectedItemMetadata && (
          <div style={{ textAlign: 'left', marginBottom: '1.5rem', padding: '12px', background: '#222', borderRadius: '8px' }}>
            <p style={{ margin: '0.5rem 0' }}><strong>Mint Date:</strong> {selectedItemMetadata.mintDate}</p>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Creator:</strong> {selectedItemMetadata.originalCreator === userAddress ? <span style={{ color: '#4ade80' }}>You</span> : selectedItemMetadata.originalCreator.slice(0,8) + '...'}
            </p>
          </div>
        )}

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Ownership History</h4>
          <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#111', padding: '12px', borderRadius: '8px' }}>
            {selectedItemHistory.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>No history recorded.</p>
            ) : (
              selectedItemHistory.map((record, i) => (
                <p key={i} style={{ fontSize: '0.85em', margin: '0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#aaa' }}>From:</span> {record.from === '0x0000000000000000000000000000000000000000' ? '🎁 Mint' : record.from.slice(0,6) + '...'} <br/>
                  <span style={{ color: '#aaa' }}>To:</span> {record.to.toLowerCase() === userAddress?.toLowerCase() ? <span style={{ color: '#4ade80' }}>You</span> : record.to.slice(0,6) + '...'}
                </p>
              ))
            )}
          </div>
        </div>

        <div style={{ textAlign: 'left', borderTop: '1px solid #444', paddingTop: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Transfer Item</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Recipient Address (0x...)"
              value={transferTarget}
              onChange={(e) => onTransferTargetChange(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
            <button onClick={onTransfer} style={{ background: '#646cff', flexShrink: 0 }}>Send</button>
          </div>
        </div>

        <div className="modal-buttons" style={{ marginTop: '1.5rem' }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

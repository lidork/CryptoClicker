import type { InventoryItem, ShopItem } from '../types';

interface InventoryScreenProps {
  inventory: InventoryItem[];
  shopItems: ShopItem[];
  onItemClick: (itemId: string) => void;
  onAgentClick: (agentId: string) => void;
}

export function InventoryScreen({
  inventory,
  shopItems,
  onItemClick,
  onAgentClick
}: InventoryScreenProps) {
  return (
    <div className="inventory-section">
      <h2>🎒 My Inventory</h2>

      <div style={{ borderTop: '2px solid #444', margin: '1.5rem 0', paddingBottom: '1rem' }}>
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#aaa' }}>
          📦 Lootbox Items ({inventory.filter(i => !i.isAgent).length})
        </h3>
      </div>

      {inventory.filter(i => !i.isAgent).length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No lootbox items owned.</p>
      ) : (
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {inventory.filter(i => !i.isAgent).map((item) => {
            const itemDetails = shopItems.find(s => s.uri === item.uri);
            let borderColor = '#444';
            if (item.strength > 40) borderColor = 'gold';
            else if (item.strength > 20) borderColor = '#4facfe';

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  width: '160px',
                  cursor: 'pointer',
                  border: `2px solid ${borderColor}`,
                  transition: 'all 0.2s',
                  padding: '15px'
                }}
                onClick={() => onItemClick(item.id)}
              >
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>📦</div>
                <p style={{ margin: '5px 0' }}><strong>{itemDetails?.name || `Item #${item.id}`}</strong></p>
                <p style={{ fontSize: '0.75em', color: '#aaa', margin: '5px 0' }}>Quality: {item.strength}/50</p>
                <button style={{ marginTop: '10px', width: '100%', fontSize: '0.8em' }}>View Details</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ borderTop: '2px solid #444', margin: '2rem 0 1rem 0', paddingTop: '1rem' }}>
        <h3 style={{ marginTop: '0', marginBottom: '0.5rem', color: '#aaa' }}>
          👥 Agents ({inventory.filter(i => i.isAgent).length})
        </h3>
        <p style={{ margin: 0, fontSize: '0.9em', color: '#888' }}>Persistent NFTs with evolving stats and abilities</p>
      </div>

      {inventory.filter(i => i.isAgent).length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No agents yet. Create one in the Agents tab!</p>
      ) : (
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {inventory.filter(i => i.isAgent).map((agent) => {
            const classEmojis: Record<string, string> = {
              'Warrior': '⚔️',
              'Guardian': '🛡️',
              'Sorcerer': '🔮'
            };

            return (
              <div
                key={agent.id}
                className="card"
                style={{
                  width: '180px',
                  cursor: 'pointer',
                  border: '2px solid #a78bfa',
                  transition: 'all 0.2s',
                  padding: '15px'
                }}
                onClick={() => onAgentClick(agent.id)}
              >
                <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>
                  {agent.agentClass ? (classEmojis[agent.agentClass] || '👤') : '👤'}
                </div>
                <p style={{ margin: '5px 0' }}><strong>{agent.agentClass || 'Agent'}</strong></p>
                <p style={{ fontSize: '0.9em', color: '#aaa', margin: '5px 0' }}>
                  <span style={{ color: '#7dd3fc' }}>Lvl {agent.level || 1}</span>
                </p>
                <p style={{ fontSize: '0.8em', color: '#bfdbfe', margin: '5px 0' }}>
                  {((agent.miningRate ?? 0) / 1e18).toFixed(2)} CLK/sec
                </p>
                <button style={{ marginTop: '10px', width: '100%', fontSize: '0.8em' }}>View Details</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

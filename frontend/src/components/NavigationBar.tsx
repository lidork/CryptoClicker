interface NavigationBarProps {
  currentScreen: 'game' | 'shop' | 'agents' | 'inventory' | 'marketplace' | 'admin';
  onChange: (screen: 'game' | 'shop' | 'agents' | 'inventory' | 'marketplace' | 'admin') => void;
  isOwner?: boolean;
}

export function NavigationBar({ currentScreen, onChange, isOwner = false }: NavigationBarProps) {
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
      <button
        onClick={() => onChange('game')}
        style={{ backgroundColor: currentScreen === 'game' ? '#646cff' : '#1a1a1a' }}
      >
        🎮 Play
      </button>
      <button
        onClick={() => onChange('shop')}
        style={{ backgroundColor: currentScreen === 'shop' ? '#646cff' : '#1a1a1a' }}
      >
        🛒 Shop
      </button>
      <button
        onClick={() => onChange('agents')}
        style={{ backgroundColor: currentScreen === 'agents' ? '#646cff' : '#1a1a1a' }}
      >
        👥 Agents
      </button>
      <button
        onClick={() => onChange('inventory')}
        style={{ backgroundColor: currentScreen === 'inventory' ? '#646cff' : '#1a1a1a' }}
      >
        🎒 Inventory
      </button>
      <button
        onClick={() => onChange('marketplace')}
        style={{ backgroundColor: currentScreen === 'marketplace' ? '#646cff' : '#1a1a1a' }}
      >
        🛍️ Marketplace
      </button>
      {isOwner && (
        <button
          onClick={() => onChange('admin')}
          style={{ 
            backgroundColor: currentScreen === 'admin' ? '#646cff' : '#1a1a1a',
            border: '2px solid #4ade80'
          }}
        >
          🔐 Admin
        </button>
      )}
    </nav>
  );
}

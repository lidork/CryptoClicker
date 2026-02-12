interface NavigationBarProps {
  currentScreen: 'game' | 'shop' | 'agents' | 'inventory';
  onChange: (screen: 'game' | 'shop' | 'agents' | 'inventory') => void;
}

export function NavigationBar({ currentScreen, onChange }: NavigationBarProps) {
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
    </nav>
  );
}

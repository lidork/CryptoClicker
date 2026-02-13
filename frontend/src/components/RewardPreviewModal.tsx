interface RewardPreviewModalProps {
  agentId: string;
  tokens: string;
  rarity: string;
  hasLoot: boolean;
  xpGain: string;
  onConfirm: (agentId: string) => void;
  onCancel: () => void;
}

export function RewardPreviewModal({
  agentId,
  tokens,
  rarity,
  hasLoot,
  xpGain,
  onConfirm,
  onCancel
}: RewardPreviewModalProps) {
  const rarityColors: Record<string, string> = {
    "Common": "#9ca3af",
    "Uncommon": "#4ade80",
    "Rare": "#3b82f6",
    "Epic": "#a855f7"
  };

  const rarityEmojis: Record<string, string> = {
    "Common": "📦",
    "Uncommon": "✨",
    "Rare": "💎",
    "Epic": "👑"
  };

  const color = rarityColors[rarity] || "#9ca3af";
  const emoji = rarityEmojis[rarity] || "🎁";

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onCancel}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#111',
          border: `2px solid ${color}`,
          borderRadius: '12px',
          padding: '2rem',
          zIndex: 2001,
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: `0 0 20px ${color}40`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 1rem 0', color: color, fontSize: '1.8em' }}>
          {emoji} {rarity} Reward!
        </h2>

        <div style={{
          background: '#222',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: `1px solid ${color}40`
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#aaa', margin: '0 0 0.5rem 0', fontSize: '0.9em' }}>
              Tokens Earned
            </p>
            <p style={{
              fontSize: '2em',
              fontWeight: 'bold',
              color: '#fbbf24',
              margin: 0
            }}>
              {tokens} CLK
            </p>
          </div>

          {hasLoot && (
            <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
              <p style={{ color: '#aaa', margin: '0 0 0.5rem 0', fontSize: '0.9em' }}>
                Bonus Item
              </p>
              <p style={{
                fontSize: '1.2em',
                color: '#4ade80',
                margin: 0,
                fontWeight: 'bold'
              }}>
                ✓ Loot Item Unlocked
              </p>
            </div>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
            <p style={{ color: '#aaa', margin: '0 0 0.5rem 0', fontSize: '0.9em' }}>
              Experience Gained
            </p>
            <p style={{
              fontSize: '1.2em',
              color: '#7dd3fc',
              margin: 0,
              fontWeight: 'bold'
            }}>
              +{xpGain} XP
            </p>
          </div>
        </div>

        <p style={{ color: '#aaa', fontSize: '0.9em', margin: '1rem 0' }}>
          This reward is now locked in. Confirm to claim your rewards!
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            onClick={onCancel}
            style={{
              background: '#444',
              color: '#fff',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1em',
              fontWeight: 'bold'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(agentId)}
            style={{
              background: color,
              color: '#000',
              border: 'none',
              padding: '0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1em',
              fontWeight: 'bold'
            }}
          >
            Claim Rewards ✓
          </button>
        </div>
      </div>
    </>
  );
}

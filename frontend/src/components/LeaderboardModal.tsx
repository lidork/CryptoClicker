import type { LeaderboardEntry } from '../types';

interface LeaderboardModalProps {
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}

export function LeaderboardModal({ leaderboard, onClose }: LeaderboardModalProps) {
  return (
    <>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1200 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1300,
          background: '#1a1a1a',
          border: '2px solid gold',
          padding: '30px',
          borderRadius: '16px',
          minWidth: '350px',
          maxWidth: '95%'
        }}
      >
        <h2 style={{ color: 'gold', textAlign: 'center', marginTop: 0 }}>🏆 Top Holders</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((entry, index) => {
            const displayName = entry.label
              ? entry.label
              : `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`
            return (
            <div
              key={entry.address}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : '#333',
                borderRadius: '8px',
                border: index === 0 ? '1px solid gold' : 'none'
              }}
            >
              <span>#{index + 1} {displayName}</span>
              <span style={{ fontWeight: 'bold' }}>{entry.balance} CLK</span>
            </div>
            )
          })}
        </div>

        <button onClick={onClose} style={{ marginTop: '20px', width: '100%' }}>
          Close
        </button>
      </div>
    </>
  );
}

interface GameScreenProps {
  clickCount: number;
  clickMultiplier: number;
  passiveIncome: number;
  unclaimedClicks: number;
  clicksPerToken: number;
  isPayoutProcessing: boolean;
  onClick: () => void;
  onPayout: () => void;
}

export function GameScreen({
  clickCount,
  clickMultiplier,
  passiveIncome,
  unclaimedClicks,
  clicksPerToken,
  isPayoutProcessing,
  onClick,
  onPayout
}: GameScreenProps) {
  return (
    <div className="game-screen">
      <h2>Click & Earn</h2>
      <button onClick={onClick} style={{ fontSize: '3em', padding: '30px' }}>
        👆
      </button>

      <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #444' }}>
        <p>
          <strong>Clicks (This Session):</strong> {clickCount}
        </p>
        <p>
          <strong>Click Multiplier:</strong> x{clickMultiplier}
        </p>
        <p>
          <strong>Passive Income:</strong> +{passiveIncome}/sec
        </p>
        <p>
          <strong>Unclaimed Clicks:</strong> {unclaimedClicks.toFixed(1)} / {clicksPerToken} for next coin
        </p>
        <button
          onClick={onPayout}
          disabled={unclaimedClicks < clicksPerToken || isPayoutProcessing}
          style={{ marginTop: '1rem', width: '100%' }}
        >
          {isPayoutProcessing ? "Processing..." : `Claim ${Math.floor(unclaimedClicks / clicksPerToken)} Tokens`}
        </button>
      </div>
    </div>
  );
}

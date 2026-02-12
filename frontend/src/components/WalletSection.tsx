import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { WalletConnect } from './WalletConnect';

interface WalletSectionProps {
  userAddress: string | null;
  tokenBalance: string;
  onAddToWallet: () => void;
  onLeaderboard: () => void;
  onConnect: (provider: BrowserProvider, signer: JsonRpcSigner, address: string) => void;
  onDisconnect: () => void;
}

export function WalletSection({
  userAddress,
  tokenBalance,
  onAddToWallet,
  onLeaderboard,
  onConnect,
  onDisconnect
}: WalletSectionProps) {
  return (
    <div className="wallet-section">
      <WalletConnect onConnect={onConnect} onDisconnect={onDisconnect} />
      {userAddress && <p>Token Balance: {tokenBalance} CLK</p>}
      {userAddress && (
        <button onClick={onAddToWallet} style={{ marginLeft: '10px', background: '#473bd0' }}>
          🦊 Add CLK to Wallet
        </button>
      )}
      <button onClick={onLeaderboard} style={{ marginLeft: '10px', background: '#571667' }}>
        🏆 Leaderboard
      </button>
    </div>
  );
}

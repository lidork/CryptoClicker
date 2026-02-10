import { useState } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

interface WalletConnectProps {
    onConnect: (provider: BrowserProvider, signer: JsonRpcSigner, address: string) => void;
}

export const WalletConnect = ({ onConnect }: WalletConnectProps) => {
    const [account, setAccount] = useState<string | null>(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                setAccount(address);
                onConnect(provider, signer, address);
            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            alert("MetaMask is not installed!");
        }
    };

    return (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
            {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
        </button>
    );
};

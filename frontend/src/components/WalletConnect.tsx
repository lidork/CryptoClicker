import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { toast } from 'react-toastify';

interface WalletConnectProps {
    onConnect: (provider: BrowserProvider, signer: JsonRpcSigner, address: string) => void;
    onDisconnect: () => void;
}

export const WalletConnect = ({ onConnect, onDisconnect }: WalletConnectProps) => {
    const [account, setAccount] = useState<string | null>(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const provider = new BrowserProvider(window.ethereum);

                //making sure users are using testnet
                const network = await provider.getNetwork();

                // 11155111 is Sepolia, 31337 is Hardhat Local
                if (network.chainId !== 11155111n && network.chainId !== 31337n) {
                    toast.warning("Wrong Network! Please switch to Sepolia Testnet.");
                }

                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                setAccount(address);
                onConnect(provider, signer, address);
            } catch (error) {
                console.error("Error connecting wallet:", error);
            }
        } else {
            toast.error("MetaMask is not installed!");
        }
    };

    const disconnectWallet = useCallback(() => {
        setAccount(null);
        onDisconnect();
    }, [onDisconnect]);

    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0 || (account && accounts[0].toLowerCase() !== account.toLowerCase())) {
                    disconnectWallet();
                }
            };

            const handleChainChanged = () => {
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                if (window.ethereum.removeListener) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    window.ethereum.removeListener('chainChanged', handleChainChanged);
                }
            };
        }
    }, [account, disconnectWallet]);

    if (account) {
        return (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
                <button onClick={disconnectWallet} style={{ padding: '5px 10px', fontSize: '14px', backgroundColor: '#e74c3c' }}>
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Connect Wallet
        </button>
    );
};

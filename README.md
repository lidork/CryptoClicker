# Crypto Clicker

> **Written by GitHub Copilot**

## 1. Project Details
Crypto Clicker is a decentralized application (dApp) game that combines the addictive nature of clicker games with blockchain technology. Players earn "clicks" by interacting with the game, which can be converted into **ClickerTokens (CLK)**, an ERC-20 cryptocurrency.

These tokens can be spent in the in-game shop to mint unique **NFT Game Items (ERC-721)**. Each item is not just a collectible but a functional game asset that boosts gameplay stats like click multiplier or passive income generation.

The project demonstrates a full-stack Web3 architecture, featuring on-chain asset ownership, history tracking for items, and interaction between a React frontend and Ethereum smart contracts.

## 2. Project Features
-   **Click-to-Earn Mechanics**: Accumulate clicks and convert them into on-chain ERC-20 tokens.
-   **In-Game Economy**: Use earned tokens to purchase items from the decentralized shop.
-   **Functional NFTs**:
    -   **Sword of Clicking**: Increases click multiplier (+1).
    -   **Shield of Holding**: Generates passive income (1 click/sec).
    -   **Crown of the Click King**: Massive multiplier bonus (+100).
-   **Asset Provenance**: Full history tracking for Game Items. View the original mint date, creator, and every past owner directly in the inventory UI.
-   **Transfer System**: definitive ownership allows players to transfer items to other wallets, carrying their game bonuses with them.
-   **Smart Contract Security**: Built-in cooldowns, transaction caps, and reentrancy guards to ensure fair play.

## 3. Tech Used
**Frontend:**
-   React
-   TypeScript
-   Vite
-   Ethers.js (v6)
-   CSS Modules

**Blockchain & Smart Contracts:**
-   Solidity (v0.8.20+)
-   Hardhat (Development Environment)
-   Hardhat Ignition (Deployment System)
-   OpenZeppelin Contracts (ERC20, ERC721, Ownable, ReentrancyGuard)
-   Sepolia Testnet (Target Network)

## 4. TODO
(To be filled out later)

## 5. Installation and Usage

### Prerequisites
-   Node.js (v18 or later)
-   MetaMask browser extension installed
-   Some Sepolia ETH (for gas fees on testnet)

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd crypto-clicker
    ```

2.  **Install Dependencies:**
    You need to install dependencies for both the smart contract workspace and the frontend.
    ```bash
    # Install root/contract dependencies
    npm install
    
    # Install frontend dependencies
    cd frontend
    npm install
    cd ..
    ```

3.  **Deploy Contracts (Sepolia):**
    Create a `.env` file in the `CryptoClicker` folder with your `SEPOLIA_URL` and `PRIVATE_KEY`.
    
    ```bash
    cd CryptoClicker
    npx hardhat ignition deploy ./ignition/modules/ClickerGame.ts --network sepolia
    ```
    *Note: If testing locally, start a local node with `npx hardhat node` and deploy without the `--network` flag.*

4.  **Configure Frontend:**
    After deployment, copy the contract addresses printed in the terminal.
    Open `frontend/src/constants.ts` and update:
    ```typescript
    export const CLICKER_TOKEN_ADDRESS = "0xYourDeployedTokenAddress";
    export const GAME_ITEM_ADDRESS = "0xYourDeployedItemAddress";
    ```

5.  **Run the Game:**
    ```bash
    cd frontend
    npm run dev
    ```
    Open your browser to `http://localhost:5173`.

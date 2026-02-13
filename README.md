# Crypto Clicker

> **Readme Written by GitHub Copilot**

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

### Phase 1: Easy Improvements (UI/UX)
- [x] **Error Notifications**: Replace browser `alert()` calls with a toast notification library (e.g., `react-toastify`) for better user experience.

### Phase 2: Game Logic Enhancements
- [x] **Dynamic Pricing**: Implement logic where item prices increase after every purchase (bonding curve) or based on supply.
- [x] **Leaderboard**: Create a simple leaderboard showing addresses with the most `CLK` tokens (requires indexing events).
- [x] **Expand Shop Inventory**: Increase item variety to at least 6 items (e.g., Potions, Pickaxes) with unique bonus mechanics implemented in the frontend. - expanded with Agents

### Phase 3: ERC-8004 "Lite" Implementation (Identity & Validation)
- [x] **Smart Contract - Agent Identity**: Refactor `GameItem.sol` to store "Agent Stats" (Level, Mining Rate, Creation Time) in a struct mapping, acting as a basic **Identity Registry**.
- [x] **Smart Contract - Validator Logic**: Implement `ECDSA` signature verification in `GameToken.sol` to ensure only the authorized server can approve reward claims (Anti-Cheat / **Validation Registry** concept).
- [x] **Backend - Signer Service**: Create a simple API endpoint (e.g., Next.js API route or Express) that validates game logic (clicks) and returns a cryptographic signature for the transaction.
- [x] **Frontend - Agent Passport**: Update the UI to display the NFT not just as an image, but as an "Agent" with visible stats and a history log (Reputation).

### Phase 4: Advanced Smart Contract Features
- [x] **Staking System**: Allow users to "stake" their NFTs to earn passive `CLK` tokens without needing to keep the tab open. - added as agents
- [ ] **Gasless Transactions**: Implement meta-transactions (EIP-2771) so users don't need Sepolia ETH to click/claim (pay gas via relayer).
- [ ] **Marketplace**: Build a native marketplace contract where users can list items for sale for `CLK` tokens (instead of just transferring them). 
- [ ] **Owner Payout** Build the infrastructure for the owner of the contracts to get paid back in `CLK` staked/used.

### Phase 5: Production Readiness
- [ ] **IPFS Integration**: Move NFT metadata (images/JSON) to real IPFS storage (Pinata/NFT.Storage) instead of hardcoded strings or local placeholders.
- [ ] **Verification**: Verify smart contract source code on Etherscan for transparency.

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

5.  **Set Up Signer Service (ERC-8004 Validator):**
    The signer service validates gameplay and signs token mint requests.
    
    ```bash
    cd CryptoClicker/signer-service
    npm install
    npm start
    ```
    
    The service will run on `http://localhost:3001`.
    
    **Important**: Update the validator address in your deployed `ClickerToken` contract:
    ```bash
    # Call setValidator() with the validator address shown in signer service logs
    # Validator Address: 0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab
    ```
    
    See [CryptoClicker/signer-service/README.md](CryptoClicker/signer-service/README.md) for more details.

6.  **Run the Game:**
    ```bash
    cd frontend
    npm run dev
    ```
    Open your browser to `http://localhost:5173`.

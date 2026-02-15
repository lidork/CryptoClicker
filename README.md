# Crypto Clicker - Final Release

> A blockchain-based idle clicker game combining gameplay with Web3 economics, anti-cheat validation, and deflationary tokenomics.

## Overview

Crypto Clicker is a fully functional decentralized game that merges traditional clicker mechanics with Ethereum smart contracts. Players earn **ClickerTokens (CLK)** through gameplay clicks, spend them on NFT items and agents, and participate in a deflationary economy where 90% of all purchases are burned, rewarding the game owner with 10% commission.

**Status**: Final Release (Production Ready) ✅  
**Network**: Sepolia Testnet  
**Token Contract**: ERC-20 (ClickerToken.sol)  
**Asset Contracts**: ERC-721 Hybrid (GameItem.sol) with ERC-8004 Lite implementation, Marketplace (Marketplace.sol)

---

## 1. Project Details
Crypto Clicker is a decentralized application (dApp) game that combines the addictive nature of clicker games with blockchain technology. Players earn "clicks" by interacting with the game, which can be converted into **ClickerTokens (CLK)**, an ERC-20 cryptocurrency.

These tokens can be spent in the in-game shop to mint unique **NFT Game Items (ERC-721)**. Each item is not just a collectible but a functional game asset that boosts gameplay stats like click multiplier or passive income generation.

The project demonstrates a full-stack Web3 architecture, featuring on-chain asset ownership, history tracking for items, and interaction between a React frontend and Ethereum smart contracts.

## 2. Core Features

### Click-to-Earn with Anti-Cheat
- **Gameplay**: Click to accumulate CLK tokens
- **Conversion**: 10 clicks = 1 CLK token
- **Validator**: ECDSA signature verification via backend (ERC-8004 Lite)
- **Cooldown**: 1-minute minimum between payouts
- **Per-Transaction Cap**: Max 10 CLK per payout
- **Supply Cap**: 1,000,000 CLK hard limit (deflationary via burns)

### Deflationary Tokenomics with Owner Revenue
- **Economic Model**: 90% burned, 10% to owner on every purchase
- **Applied To**: Lootbox items + Agent NFTs
- **Owner Revenue**: Direct commission (10%) + Marketplace fees (10%)
- **Withdrawal**: One-click admin panel withdrawal

### Dynamic Bonding Curve Pricing
- **Items**: Base price + increment per purchase
- **Agents**: Per-class dynamic pricing (500 CLK base + 10 CLK per agent)
- **Marketplace**: Player-set prices + 10% automatic platform fee

### Functional NFT Assets

**Lootbox Items** (ERC-721, consumable):
-   **Sword of Clicking**: +0.01 to +0.50 click multiplier
-   **Shield of Holding**: +0.1 to +5 passive clicks/sec
-   **Scepter of the Infinite**: +50 multiplier & +20 passive/sec

**Agent NFTs** (ERC-8004 Lite Identity Registry):
-   **Persistent Identity**: Each agent is a mutable NFT with on-chain identity data (stats, level, mining rate, creation time)
-   **Leveling & Experience**: Agents gain XP by completing quests, with stats improving per level
-   **Classes & Specialization**:
    - **Warrior**: +5% click bonus/level, 0.5 CLK/sec mining
    - **Guardian**: +10% passive/level, 1 CLK/sec mining
    - **Sorcerer**: +2% click & +8% passive/level, 2 CLK/sec mining
-   **Quest System**: Send agents on quests to earn CLK rewards and experience, level up, and unlock stat bonuses
-   **Transferability**: Full provenance tracking—agents retain their history, stats, and quest logs when transferred between wallets
-   **Anti-Cheat Validation**: Quest rewards and stat claims are cryptographically verified via ECDSA (ERC-8004 Validation Layer)

### P2P Marketplace with Full Provenance
- **Trading**: List NFTs (items & agents) at custom prices
- **Fees**: 10% platform fee auto-deducted from buyer
- **History**: Full transfer history tracked on-chain with provenance data
- **Verification**: All trades and ownership changes recorded immutably

### Owner Admin Panel
- Revenue tracking & withdrawals (commissions + marketplace fees)
- True leaderboard (all wallets) with burn tracking
- Debug tools
- Owner-only access

### Security Features
- ECDSA signature validation
- Nonce-based replay protection
- Cooldown rate limiting
- ReentrancyGuard
- Supply cap prevents inflation

---

## 3. Tech Stack
**Frontend:**
-   React v19.2.0
-   TypeScript
-   Vite
-   Ethers.js (v6)
-   CSS Modules
-   React-Toastify (notifications)

**Backend:**
-   Express.js v4.18.2
-   Node.js
-   ECDSA signature generation
-   Nonce-based replay protection

**Blockchain & Smart Contracts:**
-   Solidity (v0.8.28)
-   Hardhat (Development Environment)
-   Hardhat Ignition (Deployment System)
-   OpenZeppelin Contracts (ERC20, ERC721, ECDSA, MessageHashUtils)
-   Sepolia Testnet (Target Network)

## 4. Development Roadmap

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
- [x] **Marketplace**: Build a native marketplace contract where users can list items for sale for `CLK` tokens (instead of just transferring them). 
- [x] **Owner Payout** Build the infrastructure for the owner of the contracts to get paid back in `CLK` staked/used.

## 5. Installation & Setup

### Prerequisites
- **Node.js** v18 or later
- **MetaMask** browser extension (Chrome, Firefox, Brave, Edge)
- **Sepolia ETH** (testnet funds) — Get from [Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- **Git** for cloning the repository

### Quick Start (6 Steps)

#### Step 1: Clone & Navigate
```bash
git clone <repository-url>
cd Final_Project
```

#### Step 2: Install Smart Contract Dependencies
```bash
cd CryptoClicker
npm install
```

#### Step 3: Deploy Contracts to Sepolia

Create a `.env` file in the `CryptoClicker` folder:
```bash
SEPOLIA_URL=https://sepolia.infura.io/v3/<your-infura-key>
PRIVATE_KEY=<your-wallet-private-key>
```

Then deploy:
```bash
npx hardhat ignition deploy ./ignition/modules/ClickerGame.ts --network sepolia
```

**Expected Output:**
```
✓ Deployment successful
  Token Contract: 0x...
  GameItem Contract: 0x...
  Marketplace Contract: 0x...
```

**Save these addresses!** You'll need them in Step 5.

#### Step 4: Start the Validator Service (Terminal Window 1)

Keep this running in the background:
```bash
cd CryptoClicker/signer-service
npm install
npm start
```

**Expected Output:**
```
Signer Service running on http://localhost:3001
Validator Address: 0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab
```

**Important**: The validator address shown (`0xc94Ed...`) is already hardcoded in the deployment, so no additional configuration is needed.

#### Step 5: Configure Frontend with Contract Addresses

Open `frontend/src/constants.ts` and update the contract addresses:
```typescript
export const CLICKER_TOKEN_ADDRESS = "0x<Token-from-Step-3>";
export const GAME_ITEM_ADDRESS = "0x<GameItem-from-Step-3>";
export const MARKETPLACE_ADDRESS = "0x<Marketplace-from-Step-3>";
```

Also verify the validator address matches:
```typescript
export const VALIDATOR_ADDRESS = "0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab";
```

#### Step 6: Run the Frontend (Terminal Window 2)

```bash
cd Final_Project/frontend
npm install
npm run dev
```

**Expected Output:**
```
✨ Vite v5.x.x ready in ...
  Local: http://localhost:5173
```

Open http://localhost:5173 in your browser and connect MetaMask.

### Troubleshooting Setup

| Issue | Solution |
|-------|----------|
| "Validator Service not reachable" | Ensure signer service is running on Terminal 1:
 `cd CryptoClicker/signer-service && npm start` |
| "Wrong network" in MetaMask | Switch to **Sepolia** in MetaMask dropdown |
| "Out of Sepolia ETH" | Request funds from [Sepolia Faucet](https://www.infura.io/faucet/sepolia) |
| Contract addresses not working | Double-check `frontend/src/constants.ts` matches deployment output |
| "INFURA_KEY not found" | Ensure `.env` file in `CryptoClicker/` with valid `SEPOLIA_URL` and `PRIVATE_KEY` |

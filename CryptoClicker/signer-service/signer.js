/**
 * Minimal Signer Service - ERC-8004 Lite Validator
 * 
 * Purpose: Act as trusted validator to sign token mint requests after
 * validating legitimate gameplay. Prevents users from self-signing arbitrary amounts.
 * 
 * Validator Address: 0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab
 */

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize validator wallet
const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY);

console.log('🔐 Signer Service Started');
console.log('   Validator Address:', wallet.address);
console.log('   Listening on: http://localhost:3001');
console.log('');

/**
 * POST /sign
 * 
 * Validates click count and returns cryptographic signature for mint transaction.
 * 
 * Request Body:
 *   - userAddress: string (Ethereum address)
 *   - clickCount: number (accumulated clicks in frontend)
 *   - nonce: number (current nonce from contract)
 * 
 * Response:
 *   - signature: string (ECDSA signature)
 *   - amount: string (Wei amount to mint)
 */
app.post('/sign', async (req, res) => {
  try {
    const { userAddress, clickCount, nonce } = req.body;
    
    // Configuration
    const CLICKS_PER_TOKEN = 10; // Should match frontend constant
    const MAX_TOKENS_PER_TX = 100; // Contract limit: MAX_MINT_PER_TX
    
    // Input validation
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }
    
    // Check minimum clicks (at least enough for 1 token)
    if (typeof clickCount !== 'number' || clickCount < CLICKS_PER_TOKEN) {
      return res.status(400).json({ 
        error: `Need at least ${CLICKS_PER_TOKEN} clicks to mint 1 token`,
        hint: `You have insufficient clicks. Keep clicking!`
      });
    }
    
    // Calculate how many tokens this would mint
    const tokensToMint = Math.floor(clickCount / CLICKS_PER_TOKEN);
    
    // Check maximum (respect contract's MAX_MINT_PER_TX limit)
    if (tokensToMint > MAX_TOKENS_PER_TX) {
      return res.status(400).json({ 
        error: `Cannot mint more than ${MAX_TOKENS_PER_TX} tokens per transaction`,
        hint: `Reduce your click count or claim in batches`
      });
    }
    
    if (typeof nonce !== 'number' || nonce < 0) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }
    
    // Token amount already calculated above (tokensToMint)
    const amountInWei = ethers.parseEther(tokensToMint.toString());
    
    // Create message hash (must match Solidity: keccak256(abi.encodePacked(user, amount, nonce)))
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256'],
      [userAddress, amountInWei, nonce]
    );
    
    // Sign the message (adds EIP-191 prefix automatically)
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    // Log for audit trail
    console.log(`✅ Signed: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)} | ${tokensToMint} CLK (${clickCount} clicks) | Nonce: ${nonce}`);
    
    res.json({ 
      signature,
      amount: amountInWei.toString(),
      clkAmount: tokensToMint // For frontend display
    });
    
  } catch (error) {
    console.error('❌ Signing error:', error.message);
    res.status(500).json({ error: 'Internal signing error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online',
    validatorAddress: wallet.address 
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✓ Ready to sign requests\n`);
});

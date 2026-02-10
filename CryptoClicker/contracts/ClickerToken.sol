// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ClickerToken is ERC20, Ownable, ReentrancyGuard {
    // PROTECTION: Global Hard Limit on tokens (1 Million)
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;
    
    // PROTECTION: Limit how many tokens can be minted in one transaction to prevent draining
    uint256 public constant MAX_MINT_PER_TX = 100 * 10**18;

    // PROTECTION: Cooldown mechanism to prevent bot spamming
    // Mapping to track the last time a user minted
    mapping(address => uint256) public lastMintTime;
    uint256 public constant COOLDOWN_TIME = 1 minutes;

    constructor() ERC20("ClickerCoin", "CLK") Ownable(msg.sender) {}

    // Public mint function that anyone can call, but with restrictions
    function mint(address to, uint256 amount) public nonReentrant {
        // PROTECTION: Input validation
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Cannot mint to zero address");

        // PROTECTION: Rate Limiting
        require(block.timestamp >= lastMintTime[msg.sender] + COOLDOWN_TIME, "Cooldown: You must wait 1 minute between mints");

        // PROTECTION: Transaction Cap
        require(amount <= MAX_MINT_PER_TX, "Exceeds max mint per transaction");

        // PROTECTION: Supply Cap
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");

        // Update the cooldown timer for the caller
        lastMintTime[msg.sender] = block.timestamp;

        _mint(to, amount);
    }

    // Owner override to mint without limits (for special events or initial distribution)
    function ownerMint(address to, uint256 amount) public onlyOwner {
         require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}
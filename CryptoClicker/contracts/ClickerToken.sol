// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ClickerToken is ERC20, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // PHASE 3: ERC-8004 Lite - Validator for Anti-Cheat
    address public validator;
    mapping(address => uint256) public nonces;

    // Events for validator changes
    event ValidatorUpdated(address indexed oldValidator, address indexed newValidator);
    event MintValidated(address indexed user, uint256 amount, uint256 nonce);

    // PROTECTION: Global Hard Limit on tokens (1 Million)
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;
    
    // PROTECTION: Limit how many tokens can be minted in one transaction to prevent draining
    uint256 public constant MAX_MINT_PER_TX = 100 * 10**18;

    // PROTECTION: Cooldown mechanism to prevent bot spamming
    // Mapping to track the last time a user minted
    mapping(address => uint256) public lastMintTime;
    uint256 public constant COOLDOWN_TIME = 1 minutes;

    constructor(address _validator) ERC20("ClickerCoin", "CLK") Ownable(msg.sender) {
        require(_validator != address(0), "Validator cannot be zero address");
        validator = _validator;
        emit ValidatorUpdated(address(0), _validator);
    }

    // Public mint function that anyone can call, but with restrictions
    // PHASE 3: Now requires ECDSA signature from authorized validator
    function mint(address to, uint256 amount, bytes memory signature, uint256 nonce) public nonReentrant {
        // PROTECTION: Input validation
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Cannot mint to zero address");

        // PHASE 3: Nonce validation (prevents replay attacks)
        require(nonce == nonces[msg.sender], "Invalid nonce");

        // PHASE 3: Signature validation (anti-cheat)
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, amount, nonce));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == validator, "Invalid signature: not signed by validator");

        // Increment nonce after successful validation
        nonces[msg.sender]++;
        emit MintValidated(msg.sender, amount, nonce);

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

    // PHASE 3: Admin function to update the validator address
    function setValidator(address _newValidator) external onlyOwner {
        require(_newValidator != address(0), "Validator cannot be zero address");
        address oldValidator = validator;
        validator = _newValidator;
        emit ValidatorUpdated(oldValidator, _newValidator);
    }

    // PHASE 3: View function to get current nonce for a user
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
}
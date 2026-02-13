/**
 * Script to update the validator address on the deployed ClickerToken contract
 * 
 * Usage: npx hardhat run scripts/setValidator.mjs --network sepolia
 */

import hre from "hardhat";

const CLICKER_TOKEN_ADDRESS = "0x1441c83cA9286AF48bafe150631F6B88D5e3e683";
const NEW_VALIDATOR_ADDRESS = "0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab";

async function main() {
  console.log("🔐 Updating Validator Address on ClickerToken");
  console.log("   Contract:", CLICKER_TOKEN_ADDRESS);
  console.log("   New Validator:", NEW_VALIDATOR_ADDRESS);
  console.log("");

  const [signer] = await hre.ethers.getSigners();
  console.log("   Using account:", signer.address);
  console.log("");

  // Get the deployed contract
  const ClickerToken = await hre.ethers.getContractFactory("ClickerToken");
  const clickerToken = ClickerToken.attach(CLICKER_TOKEN_ADDRESS);

  // Get current validator
  const currentValidator = await clickerToken.validator();
  console.log("   Current Validator:", currentValidator);
  console.log("");

  if (currentValidator.toLowerCase() === NEW_VALIDATOR_ADDRESS.toLowerCase()) {
    console.log("✅ Validator is already set correctly!");
    return;
  }

  // Update validator
  console.log("📡 Sending setValidator transaction...");
  const tx = await clickerToken.setValidator(NEW_VALIDATOR_ADDRESS);
  console.log("   Transaction hash:", tx.hash);
  
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  
  // Verify the update
  const updatedValidator = await clickerToken.validator();
  console.log("");
  console.log("✅ Validator updated successfully!");
  console.log("   New Validator:", updatedValidator);
  console.log("");
  console.log("🎯 Signer service can now validate token mints!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

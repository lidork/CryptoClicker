import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClickerGameModule", (m) => {
  // Validator address for ERC-8004 Lite signer service
  const VALIDATOR_ADDRESS = "0xc94EdD970dff7fFb3f500969d15632EF1E5Bb2ab";
  
  // Deploy ClickerToken with validator address
  const clickerToken = m.contract("ClickerToken", [VALIDATOR_ADDRESS]);

  const questLootLib = m.library("QuestLootLib");
  const pricingLib = m.library("PricingLib");
  const agentMathLib = m.library("AgentMathLib");

  const gameItem = m.contract("GameItem", [clickerToken], {
    libraries: {
      QuestLootLib: questLootLib,
      PricingLib: pricingLib,
      AgentMathLib: agentMathLib
    }
  });

  const marketplace = m.contract("Marketplace", [gameItem, clickerToken]);

  return { clickerToken, gameItem, marketplace };
});

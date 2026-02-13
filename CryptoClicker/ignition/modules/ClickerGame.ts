import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClickerGameModule", (m) => {

  const clickerToken = m.contract("ClickerToken");

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

  return { clickerToken, gameItem };
});

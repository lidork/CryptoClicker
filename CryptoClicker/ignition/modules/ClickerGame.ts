import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClickerGameModule", (m) => {

  const clickerToken = m.contract("ClickerToken");

  const gameItem = m.contract("GameItem");

  return { clickerToken, gameItem };
});

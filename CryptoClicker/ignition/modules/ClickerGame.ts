import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ClickerGameModule", (m) => {

  const clickerToken = m.contract("ClickerToken");

  const gameItem = m.contract("GameItem", [clickerToken]);

  
  // These URIs must match what the frontend expects in constants.ts to show the correct names/images
  
  // Common Items
  m.call(gameItem, "addCommonURI", ["ipfs://valid-uri-1"], { id: "add_sword" }); 
  m.call(gameItem, "addCommonURI", ["ipfs://valid-uri-2"], { id: "add_shield" });

  // Rare Items
  m.call(gameItem, "addRareURI", ["ipfs://valid-uri-3"], { id: "add_crown" });

  return { clickerToken, gameItem };
});

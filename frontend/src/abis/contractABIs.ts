export const ClickerTokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function mint(address to, uint256 amount) public",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

export const GameItemABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mintItem(address player, string memory tokenURI) returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function getItemHistory(uint256 tokenId) view returns (tuple(address from, address to, uint256 timestamp)[])",
  "function items(uint256 tokenId) view returns (uint256 purchasePrice, uint256 mintDate, address originalCreator)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

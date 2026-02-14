export interface ItemHistoryRecord {
  from: string;
  to: string;
}

export interface ItemMetadata {
  purchasePrice: string;
  mintDate: string;
  originalCreator: string;
  strength: string;
}

export interface InventoryItem {
  id: string;
  uri: string;
  strength: number;
  isAgent?: boolean;
  agentClass?: string;
  level?: number;
  miningRate?: number;
  experience?: number;
  xpGainVariance?: number;
}

export interface LeaderboardEntry {
  address: string;
  balance: string;
}

export interface AgentDetails {
  tokenId: string;
  level: number;
  miningRate: number;
  creationTime: number;
  experience: number;
  strength: number;
  agentClass: string;
  xpGainVariance: number;
}

export interface ShopItem {
  name: string;
  description: string;
  price: number;
  uri: string;
}

export interface MarketplaceListing {
  id: string;
  seller: string;
  tokenId: string;
  price: string;
  listedAt: number;
  itemDetails: InventoryItem;
}

export interface UserListing {
  id: string;
  tokenId: string;
  price: string;
  listedAt: number;
  itemDetails: InventoryItem;
}

export interface AgentClassConfig {
  name: string;
  description: string;
  emoji: string;
  baseMiningRate: number;
  miningRateUnit: string;
}

export interface QuestInfo {
  endTime: number;
  duration: number;
  isComplete: boolean;
}

export interface AgentHistoryEvent {
  type: 'created' | 'levelUp' | 'xpGain' | 'questStarted' | 'questCompleted';
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  data: {
    level?: number;
    newMiningRate?: number;
    xpAmount?: number;
    totalExperience?: number;
    duration?: number;
    tokensEarned?: number;
    lootRarity?: string;
  };
}

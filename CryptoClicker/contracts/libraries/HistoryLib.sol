// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library HistoryLib {
    enum TransferSource { DIRECT, SHOP, MARKETPLACE, QUEST_REWARD }

    struct TransferRecord {
        address from;
        address to;
        uint256 price;
        uint256 timestamp;
        TransferSource source;
    }

    struct QuestPassportRecord {
        address owner;
        uint256 startTime;
        uint256 endTime;
        uint256 duration;
        uint256 rewardTokens;
        string rewardRarity;
        string rewardItemUri;
        uint256 xpBefore;
        uint256 xpGained;
        uint256 xpAfter;
    }

    struct HistoryStore {
        mapping(uint256 => TransferRecord[]) transferHistory;
        mapping(uint256 => QuestPassportRecord[]) questHistory;
    }

    function addTransfer(
        HistoryStore storage store,
        uint256 tokenId,
        address from,
        address to,
        uint256 price,
        uint256 timestamp,
        TransferSource source
    ) internal {
        store.transferHistory[tokenId].push(TransferRecord({
            from: from,
            to: to,
            price: price,
            timestamp: timestamp,
            source: source
        }));
    }

    function addQuest(
        HistoryStore storage store,
        uint256 tokenId,
        QuestPassportRecord memory record
    ) internal {
        store.questHistory[tokenId].push(record);
    }

    function transferLength(HistoryStore storage store, uint256 tokenId)
        internal
        view
        returns (uint256)
    {
        return store.transferHistory[tokenId].length;
    }

    function transferRecord(
        HistoryStore storage store,
        uint256 tokenId,
        uint256 index
    ) internal view returns (TransferRecord memory) {
        return store.transferHistory[tokenId][index];
    }

    function questLength(HistoryStore storage store, uint256 tokenId)
        internal
        view
        returns (uint256)
    {
        return store.questHistory[tokenId].length;
    }

    function questRecord(
        HistoryStore storage store,
        uint256 tokenId,
        uint256 index
    ) internal view returns (QuestPassportRecord memory) {
        return store.questHistory[tokenId][index];
    }
}

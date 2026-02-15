import { useState, useEffect, type JSX } from 'react';
import { QUEST_DURATIONS, MARKETPLACE_ADDRESS } from '../constants';
import type { AgentDetails, ItemHistoryRecord, AgentHistoryEvent } from '../types';
import { ZeroAddress } from 'ethers';

interface AgentDetailsModalProps {
  selectedAgentDetails: AgentDetails;
  selectedItemHistory: ItemHistoryRecord[];
  agentHistory: AgentHistoryEvent[];
  isLoadingHistory: boolean;
  userAddress: string | null;
  getAgentSkills: (agentClass: string, level: number) => string[];
  onClose: () => void;
  onLoadHistory: (tokenId: string) => void;
  isOnQuest: boolean;
  questEndTime?: number;
  questDuration?: number;
  canCompleteQuest: boolean;
  isEquipped: boolean;
  onEquip: (tokenId: string) => void;
  onUnequip: () => void;
  onSendQuest: (tokenId: string, duration: number) => void;
  onPreviewRewards: (tokenId: string) => void;
  onListItem?: (tokenId: string, price: string) => Promise<void>;
}

export function AgentDetailsModal({
  selectedAgentDetails,
  selectedItemHistory,
  agentHistory,
  isLoadingHistory,
  userAddress,
  getAgentSkills,
  onClose,
  onLoadHistory,
  isOnQuest,
  questEndTime,
  questDuration,
  canCompleteQuest,
  isEquipped,
  onEquip,
  onUnequip,
  onSendQuest,
  onPreviewRewards,
  onListItem
}: AgentDetailsModalProps) {
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));
  const [listPrice, setListPrice] = useState('');
  const [isListing, setIsListing] = useState(false);
  
  // Generate consistent color for wallet address
  const getAddressColor = (address: string): string => {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 65%)`;
  };
  
  // Format address with label and color
  const formatAddress = (address: string): JSX.Element => {
    if (address === ZeroAddress) {
      return <span style={{ color: '#4ade80' }}>🎁 Mint</span>;
    }
    if (address.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
      return <span style={{ color: '#f59e0b' }}>🛍️ Marketplace</span>;
    }
    if (address.toLowerCase() === userAddress?.toLowerCase()) {
      return <span style={{ color: '#4ade80' }}>You</span>;
    }
    return <span style={{ color: getAddressColor(address) }}>{address.slice(0, 6)}...{address.slice(-4)}</span>;
  };
  
  // Load history when modal opens
  useEffect(() => {
    if (selectedAgentDetails.tokenId) {
      onLoadHistory(selectedAgentDetails.tokenId);
    }
  }, [selectedAgentDetails.tokenId, onLoadHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return (
    <>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }}
        onClick={onClose}
      />
      <div className="modal-content" style={{ zIndex: 1000, maxWidth: '600px' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#646cff' }}>
          {selectedAgentDetails.agentClass} Agent #{selectedAgentDetails.tokenId}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #646cff' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>Level</p>
            <p style={{ margin: 0, fontSize: '1.8em', fontWeight: 'bold', color: '#7dd3fc' }}>{selectedAgentDetails.level}</p>
          </div>

          <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>Mining Rate</p>
            <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#4ade80' }}>
              {(selectedAgentDetails.miningRate / 1e18).toFixed(2)}{' '}
              <span style={{ fontSize: '0.6em', color: '#aaa' }}>CLK/sec</span>
            </p>
          </div>

          <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>Experience</p>
            <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#fbbf24' }}>{selectedAgentDetails.experience}</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8em', color: '#bfdbfe' }}>
              {Math.ceil((selectedAgentDetails.level * 100) - selectedAgentDetails.experience)} XP to level {selectedAgentDetails.level + 1}
            </p>
          </div>

          <div style={{ background: '#222', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #a78bfa' }}>
            <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>XP Variance</p>
            <p style={{ margin: 0, fontSize: '1.5em', fontWeight: 'bold', color: '#a78bfa' }}>
              {((selectedAgentDetails.xpGainVariance / 1e18) * 100).toFixed(0)}%
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8em', color: '#bfdbfe' }}>Leveling speed multiplier</p>
          </div>
        </div>

        <div style={{ background: '#222', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Base Strength:</strong> {selectedAgentDetails.strength}/50
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Created:</strong> {new Date(selectedAgentDetails.creationTime * 1000).toLocaleDateString()}
          </p>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#7dd3fc' }}>⭐ Agent Abilities</h4>
          <div style={{ background: '#111', padding: '12px', borderRadius: '8px' }}>
            {getAgentSkills(selectedAgentDetails.agentClass, selectedAgentDetails.level).map((skill, idx) => (
              <p key={idx} style={{ margin: '0.5rem 0', fontSize: '0.9em', lineHeight: '1.5', color: '#ccc' }}>
                {skill}
              </p>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#7dd3fc' }}>🗺️ Quest & Equipment Status</h4>
          {isOnQuest ? (
            <div style={{ background: '#111', padding: '12px', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <p style={{ margin: '0.5rem 0', fontSize: '1.1em', color: '#fbbf24', fontWeight: 'bold' }}>
                🏃 Agent is currently on a quest!
              </p>
              <p style={{ margin: '0.5rem 0', color: '#ccc' }}>
                Returns: {questEndTime ? new Date(questEndTime * 1000).toLocaleString() : 'Unknown'}
              </p>
              
              {/* Progress Bar */}
              {questEndTime && questDuration && (
                <div style={{ margin: '0.75rem 0' }}>
                  <div style={{ 
                    background: '#222', 
                    borderRadius: '4px', 
                    height: '20px', 
                    overflow: 'hidden',
                    marginBottom: '0.5rem'
                  }}>
                    {(() => {
                      // Calculate progress based on quest duration
                      const remaining = Math.max(0, questEndTime - currentTime);
                      const elapsed = questDuration - remaining;
                      const percentage = questDuration > 0 ? Math.min((elapsed / questDuration) * 100, 100) : 0;
                      
                      return (
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, #4ade80, #fbbf24)`,
                          transition: 'width 0.3s ease'
                        }} />
                      );
                    })()}
                  </div>
                  <p style={{ fontSize: '0.8em', color: '#aaa', margin: 0 }}>
                    {(() => {
                      const remaining = Math.max(0, questEndTime - currentTime);
                      if (remaining > 3600) {
                        return `${(remaining / 3600).toFixed(1)} hours remaining`;
                      } else if (remaining > 60) {
                        return `${Math.round(remaining / 60)} minutes remaining`;
                      } else {
                        return `${Math.round(remaining)} seconds remaining`;
                      }
                    })()}
                  </p>
                </div>
              )}
              
              {canCompleteQuest ? (
                <button 
                  onClick={() => onPreviewRewards(selectedAgentDetails.tokenId)}
                  style={{ marginTop: '0.5rem', background: '#fbbf24', color: '#000', fontWeight: 'bold' }}
                >
                 👁️ Preview Rewards & Complete
                </button>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic', margin: '0.5rem 0' }}>Quest in progress... (may take extra time according to load)</p>
              )}
            </div>
          ) : (
            <div style={{ background: '#111', padding: '12px', borderRadius: '8px' }}>
              {isEquipped ? (
                <div>
                  <p style={{ color: '#4ade80', margin: '0.5rem 0', fontWeight: 'bold' }}>
                    ⚡ Currently Equipped (providing bonuses)
                  </p>
                  <button onClick={onUnequip} style={{ marginTop: '0.5rem' }}>
                    Unequip Agent
                  </button>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={() => onEquip(selectedAgentDetails.tokenId)}
                    style={{ marginBottom: '1rem', background: '#4ade80', color: '#000' }}
                  >
                    ⚡ Equip Agent (Get Bonuses)
                  </button>
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#aaa', fontSize: '0.9em' }}>Send on quest:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button 
                        onClick={() => onSendQuest(selectedAgentDetails.tokenId, QUEST_DURATIONS.SHORT.seconds)}
                        style={{ fontSize: '0.85em', padding: '8px' }}
                      >
                        {QUEST_DURATIONS.SHORT.label}
                      </button>
                      <button 
                        onClick={() => onSendQuest(selectedAgentDetails.tokenId, QUEST_DURATIONS.MEDIUM.seconds)}
                        style={{ fontSize: '0.85em', padding: '8px' }}
                      >
                        {QUEST_DURATIONS.MEDIUM.label}
                      </button>
                      <button 
                        onClick={() => onSendQuest(selectedAgentDetails.tokenId, QUEST_DURATIONS.LONG.seconds)}
                        style={{ fontSize: '0.85em', padding: '8px', gridColumn: 'span 2' }}
                      >
                        {QUEST_DURATIONS.LONG.label}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Agent History Section */}
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#7dd3fc' }}>📜 Agent Passport - Activity Log</h4>
          <div style={{ background: '#111', padding: '12px', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {isLoadingHistory ? (
              <p style={{ color: '#aaa', fontStyle: 'italic', margin: 0 }}>Loading history...</p>
            ) : agentHistory.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>No events yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agentHistory.map((event, idx) => {
                  const eventDate = new Date(event.timestamp * 1000);
                  const timeAgo = getTimeAgo(event.timestamp);
                  
                  return (
                    <div 
                      key={`${event.transactionHash}-${idx}`}
                      style={{ 
                        background: '#1a1a1a', 
                        padding: '10px', 
                        borderRadius: '6px',
                        borderLeft: '3px solid ' + getEventColor(event.type)
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.1em' }}>{getEventIcon(event.type)} {getEventTitle(event)}</span>
                        <span style={{ fontSize: '0.75em', color: '#666' }}>{timeAgo}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85em', color: '#aaa' }}>
                        {eventDate.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Reputation Metrics */}
          {agentHistory.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px', 
              marginTop: '12px' 
            }}>
              <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5em', color: '#4ade80' }}>
                  {agentHistory.filter(e => e.type === 'questCompleted').length}
                </div>
                <div style={{ fontSize: '0.75em', color: '#aaa' }}>Quests</div>
              </div>
              <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5em', color: '#7dd3fc' }}>
                  {agentHistory.filter(e => e.type === 'levelUp').length}
                </div>
                <div style={{ fontSize: '0.75em', color: '#aaa' }}>Level Ups</div>
              </div>
              <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5em', color: '#a78bfa' }}>
                  {Math.ceil((currentTime - selectedAgentDetails.creationTime) / 86400)}
                </div>
                <div style={{ fontSize: '0.75em', color: '#aaa' }}>Days Old</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Transfer History</h4>
          <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#111', padding: '12px', borderRadius: '8px' }}>
            {selectedItemHistory.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>No transfer history.</p>
            ) : (
              selectedItemHistory.map((record, i) => (
                <p key={i} style={{ fontSize: '0.85em', margin: '0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#aaaaaa' }}>From:</span> {formatAddress(record.from)} <br/>
                  <span style={{ color: '#aaa' }}>To:</span> {formatAddress(record.to)}
                </p>
              ))
            )}
          </div>
        </div>

        <div style={{ textAlign: 'left', borderTop: '1px solid #444', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🛍️ List on Marketplace</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              placeholder="Price in CLK"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              min="0.1"
              step="0.1"
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: 'white' }}
            />
            <button 
              onClick={async () => {
                if (onListItem && listPrice && parseFloat(listPrice) > 0) {
                  setIsListing(true);
                  try {
                    await onListItem(selectedAgentDetails.tokenId, listPrice);
                    setListPrice('');
                  } finally {
                    setIsListing(false);
                  }
                }
              }}
              disabled={!listPrice || parseFloat(listPrice) <= 0 || isListing || !onListItem}
              style={{ 
                background: isListing ? '#555' : '#4ade80', 
                flexShrink: 0,
                cursor: (!listPrice || parseFloat(listPrice) <= 0 || isListing || !onListItem) ? 'not-allowed' : 'pointer',
                opacity: (!listPrice || parseFloat(listPrice) <= 0 || isListing || !onListItem) ? 0.5 : 1
              }}
            >
              {isListing ? '⏳ Listing...' : '📤 List'}
            </button>
          </div>
        </div>

        <div className="modal-buttons" style={{ marginTop: '1.5rem' }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

// Helper functions for event display
function getEventIcon(type: AgentHistoryEvent['type']): string {
  switch (type) {
    case 'created': return '🎉';
    case 'levelUp': return '⬆️';
    case 'xpGain': return '✨';
    case 'questStarted': return '🏃';
    case 'questCompleted': return '🏆';
    default: return '📝';
  }
}

function getEventColor(type: AgentHistoryEvent['type']): string {
  switch (type) {
    case 'created': return '#646cff';
    case 'levelUp': return '#7dd3fc';
    case 'xpGain': return '#fbbf24';
    case 'questStarted': return '#a78bfa';
    case 'questCompleted': return '#4ade80';
    default: return '#666';
  }
}

function getEventTitle(event: AgentHistoryEvent): string {
  switch (event.type) {
    case 'created': return 'Agent Created';
    case 'levelUp': return `Leveled up to ${event.data.level}`;
    case 'xpGain': return `Gained ${event.data.xpAmount} XP`;
    case 'questStarted': return 'Quest Started';
    case 'questCompleted': 
      return `Quest Complete (+${event.data.xpAmount} XP, ${(Number(event.data.tokensEarned || 0) / 1e18).toFixed(2)} CLK)`;
    default: return 'Event';
  }
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

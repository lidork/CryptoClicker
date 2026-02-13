import { useState, useEffect } from 'react';
import { QUEST_DURATIONS } from '../constants';
import type { AgentDetails, ItemHistoryRecord } from '../types';

interface AgentDetailsModalProps {
  selectedAgentDetails: AgentDetails;
  selectedItemHistory: ItemHistoryRecord[];
  userAddress: string | null;
  getAgentSkills: (agentClass: string, level: number) => string[];
  onClose: () => void;
  isOnQuest: boolean;
  questEndTime?: number;
  questDuration?: number;
  canCompleteQuest: boolean;
  isEquipped: boolean;
  onEquip: (tokenId: string) => void;
  onUnequip: () => void;
  onSendQuest: (tokenId: string, duration: number) => void;
  onPreviewRewards: (tokenId: string) => void;
}

export function AgentDetailsModal({
  selectedAgentDetails,
  selectedItemHistory,
  userAddress,
  getAgentSkills,
  onClose,
  isOnQuest,
  questEndTime,
  questDuration,
  canCompleteQuest,
  isEquipped,
  onEquip,
  onUnequip,
  onSendQuest,
  onPreviewRewards
}: AgentDetailsModalProps) {
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));

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

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Transfer History</h4>
          <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#111', padding: '12px', borderRadius: '8px' }}>
            {selectedItemHistory.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>No transfer history.</p>
            ) : (
              selectedItemHistory.map((record, i) => (
                <p key={i} style={{ fontSize: '0.85em', margin: '0.5rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#aaa' }}>From:</span> {record.from === '0x0000000000000000000000000000000000000000' ? '🎁 Mint' : record.from.slice(0,6) + '...'} <br/>
                  <span style={{ color: '#aaa' }}>To:</span> {record.to.toLowerCase() === userAddress?.toLowerCase() ? <span style={{ color: '#4ade80' }}>You</span> : record.to.slice(0,6) + '...'}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="modal-buttons" style={{ marginTop: '1.5rem' }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

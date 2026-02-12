import type { AgentDetails, ItemHistoryRecord } from '../types';

interface AgentDetailsModalProps {
  selectedAgentDetails: AgentDetails;
  selectedItemHistory: ItemHistoryRecord[];
  userAddress: string | null;
  getAgentSkills: (agentClass: string, level: number) => string[];
  onClose: () => void;
}

export function AgentDetailsModal({
  selectedAgentDetails,
  selectedItemHistory,
  userAddress,
  getAgentSkills,
  onClose
}: AgentDetailsModalProps) {
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

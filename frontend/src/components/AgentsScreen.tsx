import type { AgentClassConfig } from '../types';

interface AgentsScreenProps {
  agentClasses: AgentClassConfig[];
  tokenBalance: string;
  agentSupplies: Record<string, number>;
  isCreatingAgent: boolean;
  selectedAgentClass: string | null;
  onOpenCreateModal: (agentClass: string) => void;
  dynamicAgentPrices: Record<string, string>;
}

export function AgentsScreen({
  agentClasses,
  tokenBalance,
  agentSupplies,
  isCreatingAgent,
  selectedAgentClass,
  onOpenCreateModal,
  dynamicAgentPrices
}: AgentsScreenProps) {
  return (
    <div className="agents-section">
      <h2>🤖 Create Agents (ERC-8004 Identity)</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Agents are persistent, leveling NFTs with two modes: <strong>Equipped</strong> (boosts your clicking) or <strong>On Quest</strong> (earns CLK tokens). 
        Each agent has randomized XP variance affecting leveling speed. Prices increase with demand (bonding curve).
      </p>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {agentClasses.map((agentClass) => {
          const livePrice = dynamicAgentPrices[agentClass.name] || '500';
          const canAfford = parseFloat(tokenBalance) >= parseFloat(livePrice);
          const supply = agentSupplies[agentClass.name] || 0;

          return (
            <div
              key={agentClass.name}
              className="card"
              style={{
                width: '220px',
                opacity: canAfford ? 1 : 0.6,
                border: selectedAgentClass === agentClass.name ? '2px solid #646cff' : '1px solid #444'
              }}
            >
              <div style={{ fontSize: '4em', margin: '15px 0' }}>{agentClass.emoji}</div>
              <h3>{agentClass.name}</h3>
              <p style={{ minHeight: '50px', fontSize: '0.9em', color: '#ccc' }}>
                {agentClass.description}
              </p>

              <div style={{ background: '#222', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <p style={{ margin: '5px 0', fontSize: '0.8em', color: '#4ade80' }}>
                  <strong>⚡ Quest Rewards:</strong> {agentClass.baseMiningRate} CLK/sec
                </p>
                <p style={{ margin: '5px 0', fontSize: '0.8em', color: '#60a5fa' }}>
                  <strong>🎯 Equipped Bonus:</strong> Scales with level
                </p>
                <p style={{ margin: '5px 0', fontSize: '0.8em', color: '#9ca3af' }}>
                  <strong>📊 Supply:</strong> {supply} created
                </p>
              </div>
              
              <p style={{ marginBottom: '10px' }}>
                Price: <strong style={{ color: canAfford ? '#4ade80' : '#ef4444' }}>{livePrice} CLK</strong>
              </p>

              <button
                onClick={() => onOpenCreateModal(agentClass.name)}
                disabled={!canAfford || isCreatingAgent}
                style={{ width: '100%', marginBottom: '10px' }}
              >
                {isCreatingAgent && selectedAgentClass === agentClass.name 
                  ? "Creating..." 
                  : "Create"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

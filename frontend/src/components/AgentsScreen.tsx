import type { AgentClassConfig } from '../types';

interface AgentsScreenProps {
  agentClasses: AgentClassConfig[];
  tokenBalance: string;
  agentSupplies: Record<string, number>;
  isCreatingAgent: boolean;
  selectedAgentClass: string | null;
  onOpenCreateModal: (agentClass: string) => void;
  agentMintCost: number;
}

export function AgentsScreen({
  agentClasses,
  tokenBalance,
  agentSupplies,
  isCreatingAgent,
  selectedAgentClass,
  onOpenCreateModal,
  agentMintCost
}: AgentsScreenProps) {
  return (
    <div className="agents-section">
      <h2>🤖 Create Agents (ERC-8004 Identity)</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Agents are persistent NFTs with evolving stats. Each agent has a randomized XP gain rate that affects leveling speed.
        Cost: {agentMintCost} CLK per agent. Choose wisely, as some agents may level up faster than others!
      </p>

      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {agentClasses.map((agentClass) => {
          const canAfford = parseFloat(tokenBalance) >= agentMintCost;
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
                <p style={{ margin: '5px 0', fontSize: '0.85em' }}>
                  <strong>Mining Rate:</strong> {agentClass.baseMiningRate} {agentClass.miningRateUnit}
                </p>
                <p style={{ margin: '5px 0', fontSize: '0.85em' }}>
                  <strong>In Circulation:</strong> {supply} agents
                </p>
              </div>

              <button
                onClick={() => onOpenCreateModal(agentClass.name)}
                disabled={!canAfford || isCreatingAgent}
                style={{ width: '100%', marginBottom: '10px' }}
              >
                {isCreatingAgent && selectedAgentClass === agentClass.name ? "Creating..." : "Create"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

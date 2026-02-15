interface AgentCreationModalProps {
  selectedAgentClass: string;
  tokenBalance: string;
  isCreatingAgent: boolean;
  currentPrice: string;
  onConfirm: (agentClass: string) => void;
  onClose: () => void;
}

export function AgentCreationModal({
  selectedAgentClass,
  tokenBalance,
  isCreatingAgent,
  currentPrice,
  onConfirm,
  onClose
}: AgentCreationModalProps) {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1200
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1300,
          background: '#1a1a1a',
          border: '2px solid #646cff',
          padding: '30px',
          borderRadius: '16px',
          minWidth: '350px',
          maxWidth: '95%'
        }}
      >
        <h2 style={{ color: '#646cff', textAlign: 'center', marginTop: 0 }}>Create {selectedAgentClass}?</h2>

        <div style={{ background: '#222', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ margin: '8px 0' }}>
            <strong>Agent Class:</strong> {selectedAgentClass}
          </p>
          <p style={{ margin: '8px 0' }}>
            <strong>Creation Cost:</strong> <span style={{ color: '#4ade80', fontSize: '1.2em' }}>{currentPrice} CLK</span>
          </p>
          <p style={{ margin: '8px 0' }}>
            <strong>Your Balance:</strong> <span style={{ color: parseFloat(tokenBalance) >= parseFloat(currentPrice) ? '#4ade80' : '#ef4444' }}>{tokenBalance} CLK</span>
          </p>
          <p style={{ margin: '8px 0', color: '#ffa500', fontSize: '0.9em' }}>
            ⚠️ This agent will have a randomized XP gain rate. Some level faster, others slower!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onConfirm(selectedAgentClass)}
            disabled={isCreatingAgent}
            style={{
              flex: 1,
              background: '#646cff',
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: isCreatingAgent ? 'not-allowed' : 'pointer',
              opacity: isCreatingAgent ? 0.7 : 1
            }}
          >
            {isCreatingAgent ? "Creating..." : "Confirm Creation"}
          </button>
          <button
            onClick={onClose}
            disabled={isCreatingAgent}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              cursor: isCreatingAgent ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

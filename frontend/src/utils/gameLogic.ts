// Pure utility functions for game logic and error handling

export function extractErrorMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const err = e as { reason?: string; message?: string; toString?: () => string }
    if (err.reason) return err.reason
    if (err.message) return err.message
    if (err.toString) return err.toString()
  }
  return String(e) || "Transaction failed"
}

export const AGENT_SKILLS: Record<string, string[]> = {
  "Warrior": [
    "⚔️ Cleave: Every 10 levels, gain +5% click multiplier",
    "🛡️ Counter: Passive income provides click boost every 30 seconds",
    "💪 Strength Boost: Base mining rate increases by 1% per level"
  ],
  "Guardian": [
    "🛡️ Fortify: Every 5 levels, gain +10% passive income",
    "🔒 Protect: Bonus XP from transfers (+5 XP per trade)",
    "⚡ Steady: Consistent leveling speed, XP gain variance reduced"
  ],
  "Sorcerer": [
    "🔮 Arcane Power: Every level, gain +2% mining rate",
    "✨ Mana Surge: Every 15 levels unlock a temporary +50% mining boost",
    "🌟 Ancient Knowledge: Learn faster - XP requirements decrease by 2% per level"
  ]
}

export function getAgentSkills(agentClass: string): string[] {
  return AGENT_SKILLS[agentClass] || []
}

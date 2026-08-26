interface ConversationStatsProps {
  conversationCount: number;
  messageCount: number;
}

function ConversationStats({
  conversationCount,
  messageCount,
}: ConversationStatsProps) {
  return (
    <section className="dashboard-panel stats-panel">
      <h2>Conversation Stats</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{conversationCount}</strong>
          <span>Total Conversations</span>
        </div>

        <div className="stat-card">
          <strong>{messageCount}</strong>
          <span>Total Messages</span>
        </div>
      </div>
    </section>
  );
}

export default ConversationStats;

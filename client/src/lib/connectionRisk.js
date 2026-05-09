const privilegedUsernames = new Set(['root', 'admin', 'administrator']);

export const buildConnectionRiskSummary = (connections = []) => {
  const riskyConnections = connections
    .map((connection) => ({
      connection,
      reasons: buildConnectionRiskReasons(connection),
    }))
    .filter((item) => item.reasons.length > 0);

  return {
    totalConnections: connections.length,
    totalRiskyConnections: riskyConnections.length,
    missingCredentialCount: connections.filter((connection) => !connection.hasPassword).length,
    privilegedUsernameCount: connections.filter((connection) => privilegedUsernames.has(String(connection.username || '').toLowerCase())).length,
    rdpConnectionCount: connections.filter((connection) => connection.type === 'rdp').length,
    topRisks: riskyConnections.slice(0, 3),
  };
};

const buildConnectionRiskReasons = (connection) => {
  const reasons = [];
  if (!connection.hasPassword) {
    reasons.push('No stored credential');
  }
  if (privilegedUsernames.has(String(connection.username || '').toLowerCase())) {
    reasons.push('Privileged username');
  }
  if (connection.type === 'rdp') {
    reasons.push('RDP target');
  }
  return reasons;
};

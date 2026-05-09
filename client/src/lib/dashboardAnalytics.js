const asCount = (value) => String(value);

export const buildDashboardAnalytics = ({ connections = [], sessions = [] } = {}) => {
  const totalConnections = connections.length;
  const activeSessions = sessions.filter((session) => (
    connections.some((connection) => (
      session.connectionId === connection.id ||
      session.connection_id === connection.id ||
      (session.host === connection.host && session.username === connection.username)
    ))
  )).length;
  const sshCount = connections.filter((connection) => (connection.type || 'ssh') === 'ssh').length;
  const rdpCount = connections.filter((connection) => connection.type === 'rdp').length;
  const credentialCount = connections.filter((connection) => connection.hasPassword).length;
  const credentialPercent = totalConnections === 0
    ? 0
    : Math.round((credentialCount / totalConnections) * 100);

  return {
    totalConnections: {
      label: 'Saved connections',
      value: asCount(totalConnections),
      detail: totalConnections === 0 ? 'Create your first target' : 'Ready to launch',
    },
    activeSessions: {
      label: 'Active sessions',
      value: asCount(activeSessions),
      detail: activeSessions === 0 ? 'No live sessions' : 'Running now',
    },
    protocolMix: {
      label: 'Protocol mix',
      value: `${sshCount} SSH / ${rdpCount} RDP`,
      detail: totalConnections === 0 ? 'No protocols yet' : 'Across saved targets',
    },
    credentialCoverage: {
      label: 'Credential coverage',
      value: `${credentialPercent}%`,
      detail: totalConnections === 0
        ? 'No saved credentials'
        : `${credentialCount} of ${totalConnections} with stored credential`,
    },
  };
};

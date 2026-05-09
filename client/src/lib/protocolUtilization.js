const protocolLabels = {
  ssh: 'SSH',
  rdp: 'RDP',
};

const protocolColors = {
  ssh: 'bg-sky-400',
  rdp: 'bg-emerald-400',
};

export const buildProtocolUtilization = (connections = []) => {
  const totals = connections.reduce((acc, connection) => {
    const key = String(connection.type || 'ssh').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const total = connections.length;

  return Object.entries(protocolLabels).map(([key, label]) => {
    const count = totals[key] || 0;
    return {
      key,
      protocol: label,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
      colorClassName: protocolColors[key],
    };
  });
};

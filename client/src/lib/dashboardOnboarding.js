export const buildDashboardOnboardingSteps = ({
  connections = [],
  sessions = [],
  connectionHealth = {},
} = {}) => {
  const hasConnection = connections.length > 0;
  const hasCheckedConnection = connections.some((connection) => {
    const status = connectionHealth[connection.id]?.status;
    return Boolean(status) && status !== 'unknown' && status !== 'checking';
  });
  const hasLaunchedSession = sessions.length > 0;

  return [
    {
      id: 'create-connection',
      label: 'Create a connection',
      description: 'Save an SSH or RDP target to start building the vault.',
      complete: hasConnection,
      action: 'add-connection',
    },
    {
      id: 'check-health',
      label: 'Check reachability',
      description: 'Run a health check before opening a live session.',
      complete: hasCheckedConnection,
    },
    {
      id: 'launch-session',
      label: 'Launch a session',
      description: 'Open a terminal or desktop session from a saved target.',
      complete: hasLaunchedSession,
    },
  ];
};

export const isDashboardOnboardingComplete = (steps = []) => (
  steps.length > 0 && steps.every((step) => step.complete)
);

import { buildConnectionRiskReasons } from './connectionRisk.js';

export const DASHBOARD_VIEW_STORAGE_KEY = 'dashboard_view_id';

export const dashboardViewDefinitions = Object.freeze([
  {
    id: 'all',
    label: 'All targets',
    description: 'Every saved connection',
    matches: () => true,
  },
  {
    id: 'favorites',
    label: 'Favorites',
    description: 'Pinned critical targets',
    matches: (connection) => Boolean(connection.isFavorite),
  },
  {
    id: 'needs-review',
    label: 'Needs review',
    description: 'Credential or access risks',
    matches: (connection) => buildConnectionRiskReasons(connection).length > 0,
  },
  {
    id: 'ssh',
    label: 'SSH only',
    description: 'Shell access targets',
    matches: (connection) => (connection.type || 'ssh') === 'ssh',
  },
  {
    id: 'rdp',
    label: 'RDP only',
    description: 'Remote desktop targets',
    matches: (connection) => connection.type === 'rdp',
  },
]);

const browserStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export const getValidDashboardViewId = (viewId) => (
  dashboardViewDefinitions.some((view) => view.id === viewId) ? viewId : 'all'
);

export const getDashboardView = (viewId) => {
  const validViewId = getValidDashboardViewId(viewId);
  return dashboardViewDefinitions.find((view) => view.id === validViewId) ?? dashboardViewDefinitions[0];
};

export const filterConnectionsByDashboardView = (connections = [], viewId = 'all') => {
  const view = getDashboardView(viewId);
  return connections.filter((connection) => view.matches(connection));
};

export const getDashboardViewCards = (connections = []) => (
  dashboardViewDefinitions.map(({ id, label, description, matches }) => ({
    id,
    label,
    description,
    count: connections.filter((connection) => matches(connection)).length,
  }))
);

export const loadDashboardViewId = (storage) => {
  try {
    const target = storage ?? browserStorage();
    return getValidDashboardViewId(target?.getItem(DASHBOARD_VIEW_STORAGE_KEY));
  } catch {
    return 'all';
  }
};

export const persistDashboardViewId = (viewId, storage) => {
  try {
    const target = storage ?? browserStorage();
    target?.setItem(DASHBOARD_VIEW_STORAGE_KEY, getValidDashboardViewId(viewId));
  } catch {
    // View persistence should never block dashboard usage.
  }
};

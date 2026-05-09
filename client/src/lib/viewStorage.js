const CURRENT_VIEW_KEY = 'current_view';
const DEFAULT_VIEW = 'dashboard';

const browserStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export const loadCurrentView = (storage) => {
  try {
    const target = storage ?? browserStorage();
    const saved = target?.getItem(CURRENT_VIEW_KEY);
    return saved === 'terminal' ? 'terminal' : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
};

export const persistCurrentView = (view, storage) => {
  try {
    const target = storage ?? browserStorage();
    target?.setItem(CURRENT_VIEW_KEY, view);
  } catch {
    // Preference persistence should never block navigation.
  }
};

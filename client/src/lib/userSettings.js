export const DEFAULT_USER_SETTINGS = Object.freeze({
  sessionPreviewMode: 'hover',
});

const USER_SETTINGS_KEY = 'user_settings';
const allowedPreviewModes = new Set(['hover', 'live']);

const browserStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export const loadUserSettings = (storage) => {
  try {
    const target = storage ?? browserStorage();
    if (!target) {
      return { ...DEFAULT_USER_SETTINGS };
    }

    const raw = target.getItem(USER_SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_USER_SETTINGS };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_USER_SETTINGS };
    }

    const sessionPreviewMode = allowedPreviewModes.has(parsed.sessionPreviewMode)
      ? parsed.sessionPreviewMode
      : DEFAULT_USER_SETTINGS.sessionPreviewMode;

    return { ...DEFAULT_USER_SETTINGS, ...parsed, sessionPreviewMode };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
};

export const persistUserSettings = (settings, storage) => {
  try {
    const target = storage ?? browserStorage();
    if (!target) {
      return;
    }
    target.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Preference persistence should never block the active session.
  }
};

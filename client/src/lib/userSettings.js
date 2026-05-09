export const DEFAULT_USER_SETTINGS = Object.freeze({
  sessionPreviewMode: 'hover',
});

const allowedPreviewModes = new Set(['hover', 'live']);

export const loadUserSettings = (storage) => {
  if (!storage) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  try {
    const raw = storage.getItem('user_settings');
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

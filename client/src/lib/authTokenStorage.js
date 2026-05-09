const AUTH_TOKEN_KEY = 'auth_token';

const browserStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export const readAuthToken = (storage) => {
  try {
    const target = storage ?? browserStorage();
    return target?.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

export const persistAuthToken = (token, storage) => {
  const target = storage ?? browserStorage();
  if (!target) {
    return;
  }

  if (token) {
    target.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  target.removeItem(AUTH_TOKEN_KEY);
};

export const createSessionId = (runtime = globalThis) => {
  const randomUUID = runtime?.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(runtime.crypto);
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

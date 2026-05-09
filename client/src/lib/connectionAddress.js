export const buildConnectionAddress = (connection) => (
  `${connection.username}@${connection.host}:${connection.port}`
);

export const copyConnectionAddress = async (connection, clipboard = null) => {
  const address = buildConnectionAddress(connection);
  const targetClipboard = clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : null);
  if (!targetClipboard?.writeText) {
    throw new Error('Clipboard is unavailable');
  }
  await targetClipboard.writeText(address);
  return address;
};

const tokenize = (value) => String(value || '')
  .toLowerCase()
  .split(/\s+/)
  .map((token) => token.trim())
  .filter(Boolean);

const searchableText = (connection) => [
  connection.name,
  connection.host,
  connection.username,
  connection.type,
  connection.port,
].join(' ').toLowerCase();

export const getQuickLaunchMatches = (connections = [], query = '', limit = 5) => {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return connections.slice(0, limit);
  }

  return connections
    .filter((connection) => {
      const haystack = searchableText(connection);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, limit);
};

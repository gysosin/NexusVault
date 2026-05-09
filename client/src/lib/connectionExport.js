const csvHeaders = ['Name', 'Host', 'Port', 'Username', 'Protocol', 'Favorite', 'Stored Credential', 'Created At'];

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
};

export const buildConnectionsCsv = (connections = []) => {
  const rows = connections.map((connection) => [
    connection.name,
    connection.host,
    connection.port,
    connection.username,
    (connection.type || 'ssh').toUpperCase(),
    connection.isFavorite ? 'Yes' : 'No',
    connection.hasPassword ? 'Yes' : 'No',
    connection.createdAt || connection.created_at || '',
  ]);

  return [csvHeaders, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
};

export const buildConnectionsExportFilename = (viewLabel, date = new Date()) => {
  const safeLabel = String(viewLabel || 'dashboard-view')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dashboard-view';
  const stamp = date.toISOString().slice(0, 10);
  return `nexusvault-${safeLabel}-${stamp}.csv`;
};

export const downloadConnectionsCsv = (connections, viewLabel) => {
  const csv = buildConnectionsCsv(connections);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildConnectionsExportFilename(viewLabel);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

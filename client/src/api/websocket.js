export const withWebSocketToken = (url, token) => {
  if (!token) return url;

  const nextUrl = new URL(url, window.location.href);
  nextUrl.searchParams.set('token', token);
  return nextUrl.toString();
};

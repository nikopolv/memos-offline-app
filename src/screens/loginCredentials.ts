export const SERVER_URL_INPUT_BEHAVIOR = {
  autoCapitalize: 'none' as const,
  autoCorrect: false,
};

export const ACCESS_TOKEN_INPUT_BEHAVIOR = {
  autoCapitalize: 'none' as const,
  autoCorrect: false,
};

export function normalizeServerUrl(serverUrl: string) {
  const trimmedUrl = serverUrl.trim();

  if (!trimmedUrl) return '';

  const urlWithProtocol = /^https?:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return urlWithProtocol.replace(/\/+$/, '');
}

export function normalizeLoginCredentials(serverUrl: string, token: string) {
  return {
    serverUrl: normalizeServerUrl(serverUrl),
    token: token.trim(),
  };
}

export function canSubmitLoginCredentials(serverUrl: string, token: string) {
  const normalized = normalizeLoginCredentials(serverUrl, token);
  return normalized.serverUrl.length > 0 && normalized.token.length > 0;
}

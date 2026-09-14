// In-memory access token store.
// Strictly ephemeral in RAM - never persisted to localStorage or disk.
// When the browser/tab is closed, this token is completely and immediately erased.

let inMemoryAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

export const tokenStore = {
  getToken: (): string | null => {
    return inMemoryAccessToken;
  },
  setToken: (token: string | null, expiresInSeconds: number = 15 * 60): void => {
    inMemoryAccessToken = token;
    tokenExpiryTime = token ? Date.now() + expiresInSeconds * 1000 : null;
  },
  clearToken: (): void => {
    inMemoryAccessToken = null;
    tokenExpiryTime = null;
  },
  isExpiringSoon: (thresholdSeconds: number = 60): boolean => {
    if (!tokenExpiryTime) return true;
    return Date.now() >= tokenExpiryTime - thresholdSeconds * 1000;
  }
};

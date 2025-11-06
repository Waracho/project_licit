//auth/authStore.ts
let _accessToken: string | null = null;

export function getAccessToken() {
  return _accessToken;
}

export function setAccessToken(tok: string | null) {
  _accessToken = tok;
}
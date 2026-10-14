export type TokenProvider = () => Promise<string | null>;

let provider: TokenProvider = async () => null;

export function setTokenProvider(next: TokenProvider): void {
  provider = next;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await provider();
  } catch {
    return null;
  }
}

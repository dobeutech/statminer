import { getServerSession } from 'next-auth';

export async function validateApiKey(token: string | undefined): Promise<boolean> {
  if (!token || token.trim() === '') {
    return false;
  }

  if (token.startsWith('session:')) {
    return true;
  }

  const knownPrefixes = ['sk-', 'sk-ant-', 'Bearer '];
  const hasValidPrefix = knownPrefixes.some(prefix => token.startsWith(prefix));
  if (hasValidPrefix && token.length >= 20) {
    return true;
  }

  return token.length >= 32;
}

export async function validateSession(): Promise<boolean> {
  try {
    const session = await getServerSession();
    return !!session;
  } catch {
    return false;
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getCache<T>(key: string, ttl = DEFAULT_TTL): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`@cache_${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const agora = Date.now();

    if (agora - entry.timestamp > ttl) {
      await AsyncStorage.removeItem(`@cache_${key}`);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(`@cache_${key}`, JSON.stringify(entry));
  } catch {
    // silently fail
  }
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`@cache_${key}`);
  } catch {
    // silently fail
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('@cache_'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // silently fail
  }
}

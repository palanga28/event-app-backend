import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Fallback pour le web (SecureStore ne fonctionne pas sur web)
const webStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

// Utilise SecureStore sur natif, localStorage sur web
export const storage = Platform.OS === 'web' ? webStorage : SecureStore;

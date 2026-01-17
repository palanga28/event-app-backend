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

// Wrapper pour SecureStore qui valide les valeurs
const secureStorageWrapper = {
  async getItemAsync(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: any): Promise<void> {
    // S'assurer que la valeur est une string
    if (value === null || value === undefined) {
      console.warn(`SecureStore: Ignoring null/undefined value for key "${key}"`);
      return;
    }
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return SecureStore.setItemAsync(key, stringValue);
  },
  async deleteItemAsync(key: string): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};

// Utilise SecureStore sur natif, localStorage sur web
export const storage = Platform.OS === 'web' ? webStorage : secureStorageWrapper;

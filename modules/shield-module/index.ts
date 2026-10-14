import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface ShieldModuleType {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startShield(options?: Record<string, any>): Promise<boolean>;
  stopShield(): Promise<boolean>;
  isShieldRunning(): Promise<boolean>;
}

let nativeShieldModule: ShieldModuleType | null = null;

if (Platform.OS === 'android') {
  try {
    nativeShieldModule = requireNativeModule('ShieldModule');
  } catch (e) {
    console.warn('[ShieldModule] Native module not loaded, using fallback mock:', e);
  }
}

// In-memory state for mock/web environment
let mockRunning = false;
let mockPermissionGranted = false;

export async function hasOverlayPermission(): Promise<boolean> {
  if (nativeShieldModule?.hasOverlayPermission) {
    try {
      return await nativeShieldModule.hasOverlayPermission();
    } catch {
      return false;
    }
  }
  return mockPermissionGranted;
}

export async function requestOverlayPermission(): Promise<boolean> {
  if (nativeShieldModule?.requestOverlayPermission) {
    try {
      await nativeShieldModule.requestOverlayPermission();
      return true;
    } catch {
      return false;
    }
  }
  mockPermissionGranted = true;
  return true;
}

export async function startShield(options?: Record<string, any>): Promise<boolean> {
  if (nativeShieldModule?.startShield) {
    try {
      return await nativeShieldModule.startShield(options);
    } catch (e) {
      console.warn('Native startShield error:', e);
      return false;
    }
  }
  mockRunning = true;
  return true;
}

export async function stopShield(): Promise<boolean> {
  if (nativeShieldModule?.stopShield) {
    try {
      return await nativeShieldModule.stopShield();
    } catch (e) {
      console.warn('Native stopShield error:', e);
      return false;
    }
  }
  mockRunning = false;
  return true;
}

export async function isShieldRunning(): Promise<boolean> {
  if (nativeShieldModule?.isShieldRunning) {
    try {
      return await nativeShieldModule.isShieldRunning();
    } catch {
      return false;
    }
  }
  return mockRunning;
}

export default {
  hasOverlayPermission,
  requestOverlayPermission,
  startShield,
  stopShield,
  isShieldRunning,
};

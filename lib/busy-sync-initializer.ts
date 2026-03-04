// lib/busy-sync-initializer.ts
// Initialize BUSY sync services when the application starts

import PulseWatcher from './pulse-watcher';

let pulseWatcher: PulseWatcher | null = null;

export const initializeBusySync = async () => {
  try {
    console.log('Initializing BUSY sync services...');
    
    // Initialize the pulse watcher
    pulseWatcher = new PulseWatcher();
    await pulseWatcher.start();
    
    console.log('BUSY sync services initialized successfully');
  } catch (error) {
    console.error('Error initializing BUSY sync services:', error);
  }
};

export const stopBusySync = async () => {
  try {
    if (pulseWatcher) {
      await pulseWatcher.stop();
      console.log('BUSY sync services stopped');
    }
  } catch (error) {
    console.error('Error stopping BUSY sync services:', error);
  }
};

// Initialize on module load
initializeBusySync();
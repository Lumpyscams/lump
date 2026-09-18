import { niceLog } from './logger.js';
import { setStatus, setBPM, setBattery, updateConnectButton } from './uiManager.js';

let device = null;
let server = null;
// CRITICAL: Keep global references to prevent garbage collection of GATT objects causing drops
let hrService = null;
let hrChar = null;
let isConnecting = false;
let isIntentionalDisconnect = false;
let dropCallback = null;

export async function connect(onHrNotify, onDrop) {
  if (!window.isSecureContext) {
    alert('Bluetooth requires a secure connection. Open Lumpo using HTTPS (or localhost).');
    setStatus('HTTPS required for Bluetooth');
    return false;
  }

  if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== 'function') {
    alert('Web Bluetooth is not available here. Use Chrome or Edge on Android, or a desktop browser that supports Web Bluetooth.');
    setStatus('Bluetooth unavailable in this browser');
    return false;
  }

  if (isConnecting) {
    niceLog('Already attempting to connect...');
    return false;
  }

  dropCallback = onDrop;
  isIntentionalDisconnect = false;

  try {
    isConnecting = true;
    updateConnectButton('requesting');
    setStatus('Searching...');
    niceLog('Opening Bluetooth selector...');
    
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['battery_service']
    });

    updateConnectButton('connecting');
    niceLog('Connecting to GATT Server...');
    
    server = await device.gatt.connect();

    // Give Windows plenty of time to resolve the GATT table before we ask for it
    await new Promise(resolve => setTimeout(resolve, 1500));

    setStatus('Discovering Services...');
    niceLog('Looking for Heart Rate Service...');
    
    // No automatic retry loops here. If it hangs for 20s and fails, 
    // retrying immediately wedges the Windows Bluetooth adapter.
    hrService = await server.getPrimaryService('heart_rate');
    
    niceLog('Looking for HR Characteristic...');
    hrChar = await hrService.getCharacteristic('heart_rate_measurement');
    
    hrChar.addEventListener('characteristicvaluechanged', (e) => {
      const value = e.target.value;
      const flags = value.getUint8(0);
      const bpm = (flags & 0x1) ? value.getUint16(1, true) : value.getUint8(1);
      onHrNotify(bpm);
    });

    niceLog('Starting Notifications...');
    await hrChar.startNotifications();

    setStatus('Connected');
    updateConnectButton('connected');
    niceLog('✅ Connected! Ready for data.');
    isConnecting = false;

    // Attach listener NOW, after the handshake is completely successful.
    device.addEventListener('gattserverdisconnected', onGattDisconnected);

    // Attempt battery read silently
    try {
      const batService = await server.getPrimaryService('battery_service');
      const batChar = await batService.getCharacteristic('battery_level');
      const v = (await batChar.readValue()).getUint8(0);
      setBattery(v);
    } catch (e) {
      niceLog('Note: Battery service not shared by device');
      setBattery(null);
    }

    return true;
  } catch (err) {
    if (err.name !== 'NotFoundError' && err.name !== 'AbortError') {
      // Print the RAW error so we can see exactly what the browser is saying
      niceLog(`❌ Error: ${err.message}`);
      
      const msg = err.message.toLowerCase();
      if (msg.includes('connection attempt failed') || msg.includes('disconnected')) {
        niceLog(`💡 Hint: The watch is busy or the PC adapter is stuck.`);
        niceLog(`Try turning Windows Bluetooth OFF and ON again.`);
      }
    } else {
      niceLog('Connect cancelled by user.');
    }

    // Ensure we free the GATT stack if the handshake failed midway
    if (device && device.gatt && device.gatt.connected) {
        try { device.gatt.disconnect(); } catch(e) {}
    }
    
    // Manual cleanup
    cleanupState();
    return false;
  }
}

/** Handles unexpected drops or manual disconnects AFTER a successful connection */
function onGattDisconnected() {
  if (!isIntentionalDisconnect) {
    niceLog('⚠️ Bluetooth connection closed unexpectedly');
    if (dropCallback) dropCallback();
  }
  
  cleanupState();
}

/** Resets all variables and UI elements */
function cleanupState() {
  isConnecting = false;
  updateConnectButton('idle');
  setStatus('Disconnected');

  if (device) {
    device.removeEventListener('gattserverdisconnected', onGattDisconnected);
  }
  
  setBPM(null);
  setBattery(null);
  
  device = null;
  server = null;
  hrService = null;
  hrChar = null;
  dropCallback = null;
}

export function disconnect() {
  if (device && device.gatt.connected) {
    isIntentionalDisconnect = true;
    device.gatt.disconnect();
  }
}

export function isConnected() {
  return device && device.gatt.connected;
}
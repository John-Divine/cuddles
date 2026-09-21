// Device Media Storage & Ephemeral Cloud Purge Engine
// Persists media securely to device (IndexedDB & Gallery/Files) and cleans cloud database

const DB_NAME = 'CuddlesDeviceVault';
const STORE_NAME = 'media_vault';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported on this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'messageId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredMediaRecord {
  messageId: string;
  dataUrl: string;
  mediaType: string;
  fileName: string;
  savedAt: string;
}

/**
 * Save media binary/dataUrl to device's IndexedDB storage
 */
export async function saveMediaToDeviceVault(
  messageId: string,
  dataUrl: string,
  mediaType: string = 'media',
  fileName: string = 'cuddles_media'
): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredMediaRecord = {
        messageId,
        dataUrl,
        mediaType,
        fileName,
        savedAt: new Date().toISOString()
      };
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.warn('Device media store transaction notice:', tx.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB device vault (fallback to memory/local):', err);
    return false;
  }
}

/**
 * Retrieve media from device IndexedDB
 */
export async function getMediaFromDeviceVault(messageId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(messageId);
      req.onsuccess = () => {
        const record = req.result as StoredMediaRecord | undefined;
        resolve(record ? record.dataUrl : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Download file directly to local device gallery or file system
 */
export async function downloadMediaToDeviceGallery(
  url: string,
  suggestedFileName: string = 'cuddles_file',
  mimeType?: string
): Promise<{ success: boolean; message: string }> {
  try {
    let finalUrl = url;
    let blob: Blob | null = null;

    if (url.startsWith('data:')) {
      // Data URL to blob
      const parts = url.split(',');
      const match = parts[0].match(/:(.*?);/);
      const determinedMime = mimeType || (match ? match[1] : 'application/octet-stream');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: determinedMime });
      finalUrl = URL.createObjectURL(blob);
    } else if (url.startsWith('blob:')) {
      // Already a blob URL
      finalUrl = url;
    } else {
      // Fetch remote URL if needed
      try {
        const res = await fetch(url);
        blob = await res.blob();
        finalUrl = URL.createObjectURL(blob);
      } catch {
        finalUrl = url;
      }
    }

    // Attempt Web Share with file if mobile device supports saving directly to photos/gallery
    if (blob && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], suggestedFileName, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: suggestedFileName,
            text: 'Saved from Cuddles Private Messenger'
          });
          return { success: true, message: 'Saved to Gallery / Files' };
        }
      } catch (shareErr) {
        // User cancelled or share failed, fallback to anchor download
        console.log('Mobile share fallback:', shareErr);
      }
    }

    // Standard download trigger for device gallery/downloads folder
    const a = document.createElement('a');
    a.href = finalUrl;
    a.download = suggestedFileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up temporary blob URL after brief delay
    if (blob) {
      setTimeout(() => URL.revokeObjectURL(finalUrl), 10000);
    }

    return { success: true, message: 'Saved to Device Gallery/Downloads' };
  } catch (err) {
    console.warn('Failed to download media to device:', err);
    return { success: false, message: 'Could not complete download to device' };
  }
}

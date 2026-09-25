// Device Media Storage & Ephemeral Cloud Purge Engine
// Persists media securely to device (IndexedDB & Gallery/Files) and cleans cloud database

const DB_NAME = 'CuddlesDeviceVault';
const STORE_NAME = 'media_vault';
const DB_VERSION = 1;

// In-memory cache for instant synchronous retrieval
const vaultMemoryCache = new Map<string, string>();
const blobUrlCache = new Map<string, string>();

/**
 * Safely extracts MIME type and base64 payload from a data URL.
 * Handles headers containing commas such as `data:video/webm;codecs=vp8,opus;base64,...`
 */
export function parseDataUrl(url: string): { mime: string; base64Data: string } | null {
  if (!url || !url.startsWith('data:')) return null;
  const base64Index = url.indexOf(';base64,');
  if (base64Index !== -1) {
    const rawMime = url.substring(5, base64Index).trim();
    const base64Data = url.substring(base64Index + ';base64,'.length);
    return { mime: rawMime, base64Data };
  }
  const commaIndex = url.indexOf(',');
  if (commaIndex === -1) return null;
  const rawMime = url.substring(5, commaIndex).trim();
  const base64Data = url.substring(commaIndex + 1);
  return { mime: rawMime, base64Data };
}

/**
 * Normalizes container MIME type to ensure compatibility with mobile media demuxers.
 * Strips codecs parameters (e.g., 'video/webm;codecs=vp8,opus' -> 'video/webm')
 * because Blob/HTML5 video players expect clean container types.
 */
export function normalizeMediaMime(mime: string, fallback?: string): string {
  const target = (mime || fallback || '').toLowerCase().trim();
  if (target.includes('webm')) return target.includes('audio') ? 'audio/webm' : 'video/webm';
  if (target.includes('mp4')) return 'video/mp4';
  if (target.includes('jpeg') || target.includes('jpg')) return 'image/jpeg';
  if (target.includes('png')) return 'image/png';
  if (target.includes('gif')) return 'image/gif';
  if (target.includes('webp')) return 'image/webp';
  if (target.includes('ogg')) return target.includes('video') ? 'video/ogg' : 'audio/ogg';
  if (target.includes('mp3') || target.includes('mpeg')) return 'audio/mpeg';
  // Strip any parameters if present
  const base = target.split(';')[0].trim();
  return base || 'application/octet-stream';
}

/**
 * Converts a base64 Data URL to a native Blob URL for high-performance hardware decoding
 * (Fixes black/unplayable video notes and audio notes in mobile Safari & Chrome)
 */
export function dataUrlToBlobUrl(url: string, mimeType?: string): string {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  if (!url.startsWith('data:')) return url;

  if (blobUrlCache.has(url)) {
    return blobUrlCache.get(url)!;
  }

  try {
    const parsed = parseDataUrl(url);
    if (!parsed) return url;

    // Prefer detected header from actual binary, fallback to mimeType parameter
    const cleanMime = normalizeMediaMime(parsed.mime, mimeType);
    const bstr = atob(parsed.base64Data);
    const len = bstr.length;
    const u8arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    const blob = new Blob([u8arr], { type: cleanMime });
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(url, blobUrl);
    return blobUrl;
  } catch (err) {
    console.warn('Failed to convert dataUrl to blobUrl:', err);
    return url;
  }
}

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
 * Save media binary/dataUrl to device's IndexedDB storage and in-memory cache
 */
export async function saveMediaToDeviceVault(
  messageId: string,
  dataUrl: string,
  mediaType: string = 'media',
  fileName: string = 'cuddles_media'
): Promise<boolean> {
  if (!dataUrl) return false;
  vaultMemoryCache.set(messageId, dataUrl);

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
 * Retrieve media from device IndexedDB or instant memory cache
 */
export async function getMediaFromDeviceVault(messageId: string): Promise<string | null> {
  if (vaultMemoryCache.has(messageId)) {
    return vaultMemoryCache.get(messageId)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(messageId);
      req.onsuccess = () => {
        const record = req.result as StoredMediaRecord | undefined;
        if (record?.dataUrl) {
          vaultMemoryCache.set(messageId, record.dataUrl);
          resolve(record.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear all device vault records (used on account deletion)
 */
export async function clearDeviceVault(): Promise<void> {
  vaultMemoryCache.clear();
  blobUrlCache.clear();
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore error on clearing
  }
}

/**
 * Retrieve all stored media records from device IndexedDB vault
 */
export async function getAllMediaFromDeviceVault(): Promise<StoredMediaRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as StoredMediaRecord[];
        resolve(records);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
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
      const parsed = parseDataUrl(url);
      if (!parsed) throw new Error('Invalid data URL format');
      const determinedMime = normalizeMediaMime(parsed.mime, mimeType);
      const bstr = atob(parsed.base64Data);
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

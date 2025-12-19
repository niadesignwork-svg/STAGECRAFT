
import { GeneratedDesign, SavedConcept } from '../types';

const DB_NAME = 'StageCraftDB';
const DB_VERSION = 1;
const STORE_NAME = 'designs';
const FOLDERS_KEY = 'stagecraft_folders_v1';
const CONCEPTS_KEY = 'stagecraft_concepts_v1';

// --- IndexedDB Helpers ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const getSavedDesigns = async (): Promise<GeneratedDesign[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as GeneratedDesign[];
        // Sort by timestamp descending (newest first)
        resolve(results.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load library from IDB", e);
    return [];
  }
};

export const saveDesignToLibrary = async (design: GeneratedDesign): Promise<GeneratedDesign[]> => {
  try {
    const db = await openDB();
    
    // We need to check if it exists to preserve the 'folder' property if not provided in the update
    const currentDesign: GeneratedDesign | undefined = await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(design.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    });

    const designToSave = {
      ...design,
      folder: design.folder !== undefined ? design.folder : currentDesign?.folder
    };

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(designToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    return getSavedDesigns();
  } catch (e) {
    console.error("Failed to save design to IDB", e);
    throw e;
  }
};

export const deleteDesignFromLibrary = async (id: string): Promise<GeneratedDesign[]> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return getSavedDesigns();
  } catch (e) {
    console.error("Failed to delete design from IDB", e);
    return getSavedDesigns();
  }
};

// --- Folder Management (Mixed IDB + LocalStorage) ---

export const getFolders = (): string[] => {
  try {
    const stored = localStorage.getItem(FOLDERS_KEY);
    if (!stored) return ['最愛 (Favorites)', '草稿 (Drafts)'];
    return JSON.parse(stored);
  } catch (e) {
    return ['最愛 (Favorites)', '草稿 (Drafts)'];
  }
};

export const createFolder = (folderName: string): string[] => {
  const folders = getFolders();
  if (!folders.includes(folderName)) {
    const newFolders = [...folders, folderName];
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
    return newFolders;
  }
  return folders;
};

export const deleteFolder = async (folderName: string): Promise<string[]> => {
  // 1. Update Folders List
  const folders = getFolders().filter(f => f !== folderName);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));

  // 2. Update all designs in IDB that were in this folder
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // We have to iterate all to find matches since we don't have an index on folder
    // For client-side usage this is acceptable speed-wise
    const designs = await getSavedDesigns(); 
    
    for (const design of designs) {
      if (design.folder === folderName) {
        await new Promise<void>((resolve) => {
          store.put({ ...design, folder: undefined });
          resolve();
        });
      }
    }
  } catch (e) {
    console.error("Failed to update designs after folder delete", e);
  }

  return folders;
};

export const moveDesignToFolder = async (designId: string, folderName?: string): Promise<GeneratedDesign[]> => {
  try {
    const db = await openDB();
    
    // Get, Modify, Put
    const design: GeneratedDesign = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(designId);
      
      req.onsuccess = () => {
        const d = req.result;
        if (d) {
          d.folder = folderName;
          store.put(d);
        }
        // Transaction auto-commits
      };
      
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });

    return getSavedDesigns();
  } catch (e) {
    console.error("Failed to move design folder", e);
    return getSavedDesigns();
  }
};

// --- Saved Concepts (Inspiration Notes) ---

export const getSavedConcepts = (): SavedConcept[] => {
  try {
    const stored = localStorage.getItem(CONCEPTS_KEY);
    if (!stored) return [];
    const concepts = JSON.parse(stored) as SavedConcept[];
    return concepts.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    return [];
  }
};

export const saveConcept = (concept: Omit<SavedConcept, 'id' | 'timestamp'>): SavedConcept[] => {
  const concepts = getSavedConcepts();
  const newConcept: SavedConcept = {
    ...concept,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };
  const updated = [newConcept, ...concepts];
  localStorage.setItem(CONCEPTS_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteConcept = (id: string): SavedConcept[] => {
  const concepts = getSavedConcepts().filter(c => c.id !== id);
  localStorage.setItem(CONCEPTS_KEY, JSON.stringify(concepts));
  return concepts;
};

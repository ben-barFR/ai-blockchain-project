import type { ComponentKind } from "@/lib/certificates/constants";

export type IssueParsedReport = {
  buildingId: string;
  postalAddress: string;
  countryCode: string;
  types: ComponentKind[];
};

export type IssueDraft = {
  customerId?: string;
  parsed?: IssueParsedReport;
  types?: ComponentKind[];
  selectedBuildingId?: string;
  parseError?: string;
};

const ISSUE_DRAFT_KEY = "bldcrt-issue-draft";
const ISSUE_FILE_DB = "bldcrt-issue";
const ISSUE_FILE_STORE = "files";
const ISSUE_FILE_KEY = "pdf";

let issueFileMemory: File | null = null;

export function pageWasReloaded() {
  if (typeof performance === "undefined") return false;
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return nav?.type === "reload";
}

export function readIssueDraft(): IssueDraft | null {
  try {
    const raw = sessionStorage.getItem(ISSUE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IssueDraft;
  } catch {
    return null;
  }
}

export function writeIssueDraft(draft: {
  customerId: string;
  parsed?: IssueParsedReport;
  types: ComponentKind[];
  selectedBuildingId?: string;
  parseError?: string;
}) {
  try {
    sessionStorage.setItem(ISSUE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

function openIssueFileDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(ISSUE_FILE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ISSUE_FILE_STORE)) {
        request.result.createObjectStore(ISSUE_FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveIssueFile(file: File) {
  issueFileMemory = file;
  try {
    const db = await openIssueFileDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ISSUE_FILE_STORE, "readwrite");
      tx.objectStore(ISSUE_FILE_STORE).put(file, ISSUE_FILE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* Keep the in-memory copy if IndexedDB is unavailable. */
  }
}

export async function readIssueFile() {
  if (issueFileMemory) return issueFileMemory;
  try {
    const db = await openIssueFileDb();
    const file = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(ISSUE_FILE_STORE, "readonly");
      const request = tx.objectStore(ISSUE_FILE_STORE).get(ISSUE_FILE_KEY);
      request.onsuccess = () => resolve((request.result as File) || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    issueFileMemory = file;
    return file;
  } catch {
    return null;
  }
}

export function clearIssueDraft() {
  issueFileMemory = null;
  try {
    sessionStorage.removeItem(ISSUE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
  void openIssueFileDb()
    .then(async (db) => {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(ISSUE_FILE_STORE, "readwrite");
        tx.objectStore(ISSUE_FILE_STORE).delete(ISSUE_FILE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    })
    .catch(() => {
      /* ignore */
    });
}

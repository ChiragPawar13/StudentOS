// Browser-local stand-in for the Firebase APIs the StudentOS screen uses.
// Data persists in localStorage so the app works without any external project.
type Rec = Record<string, any>;
type Listener = () => void;

const KEY = "studentos-db-v1";
const listeners = new Map<string, Set<Listener>>();

const load = (): Record<string, Record<string, Rec>> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const save = (data: Record<string, Record<string, Rec>>) => localStorage.setItem(KEY, JSON.stringify(data));
const notify = (col: string) => listeners.get(col)?.forEach((l) => l());
const newId = () => Math.random().toString(36).slice(2, 12);

export const initializeApp = (_cfg?: unknown) => ({});
export const getFirestore = (_app?: unknown) => ({});

const USER = { uid: "local-user", displayName: "" as string | null };
export const getAuth = (_app?: unknown) => ({ currentUser: USER as typeof USER | null });
export const signInAnonymously = async (_a?: unknown) => ({ user: USER });
export const signInWithCustomToken = async (_a?: unknown, _t?: string) => ({ user: USER });
export const updateProfile = async (u: typeof USER, p: { displayName?: string }) => {
  u.displayName = p.displayName ?? u.displayName;
};
export const onAuthStateChanged = (_a: unknown, cb: (u: typeof USER) => void) => {
  setTimeout(() => cb(USER), 0);
  return () => {};
};

export const serverTimestamp = () => ({ seconds: Math.floor(Date.now() / 1000) });
export const collection = (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") });
export const doc = (_db: unknown, ...segs: string[]) => ({ col: segs.slice(0, -1).join("/"), id: segs[segs.length - 1] });

export const getDoc = async (ref: { col: string; id: string }) => {
  const d = load()[ref.col]?.[ref.id];
  return { exists: () => !!d, data: () => d, id: ref.id };
};
export const setDoc = async (ref: { col: string; id: string }, value: Rec) => {
  const data = load();
  data[ref.col] = { ...(data[ref.col] || {}), [ref.id]: value };
  save(data);
  notify(ref.col);
};
export const addDoc = async (ref: { path: string }, value: Rec) => {
  const id = newId();
  await setDoc({ col: ref.path, id }, value);
  return { id };
};
export const updateDoc = async (ref: { col: string; id: string }, value: Rec) => {
  const data = load();
  const cur = data[ref.col]?.[ref.id];
  if (!cur) return;
  data[ref.col]![ref.id] = { ...cur, ...value };
  save(data);
  notify(ref.col);
};
export const deleteDoc = async (ref: { col: string; id: string }) => {
  const data = load();
  delete data[ref.col]?.[ref.id];
  save(data);
  notify(ref.col);
};
export const onSnapshot = (ref: { path: string }, cb: (snap: { forEach: (f: (d: any) => void) => void }) => void) => {
  const emit = () => {
    const rows = Object.entries(load()[ref.path] || {});
    cb({ forEach: (f) => rows.forEach(([id, v]) => f({ id, data: () => v })) });
  };
  if (!listeners.has(ref.path)) listeners.set(ref.path, new Set());
  listeners.get(ref.path)!.add(emit);
  emit();
  return () => listeners.get(ref.path)?.delete(emit);
};

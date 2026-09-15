/**
 * Recentes e favoritos — armazenados apenas neste dispositivo (localStorage).
 * Não altera o banco do Supabase nem o CRM.
 */

export interface RecentTruck {
  id: string;
  label: string;
  plate?: string | null;
  at: number;
}

const RECENT_KEY = "imperio:recent-trucks";
const FAV_KEY = "imperio:fav-trucks";
const MAX_RECENT = 8;

function read(key: string): RecentTruck[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(key: string, items: RecentTruck[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* localStorage indisponível — ignora */
  }
}

export function getRecentTrucks(): RecentTruck[] {
  return read(RECENT_KEY).sort((a, b) => b.at - a.at);
}

export function pushRecentTruck(t: { id: string; label: string; plate?: string | null }) {
  const items = read(RECENT_KEY).filter((r) => r.id !== t.id);
  items.unshift({ id: t.id, label: t.label, plate: t.plate ?? null, at: Date.now() });
  save(RECENT_KEY, items);
  return items;
}

export function getRecentCustomers(): { id: string; name: string; at: number }[] {
  try {
    const raw = localStorage.getItem("imperio:recent-customers");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecentCustomer(id: string, name: string) {
  try {
    const items = getRecentCustomers().filter((c) => c.id !== id);
    items.unshift({ id, name, at: Date.now() });
    localStorage.setItem("imperio:recent-customers", JSON.stringify(items.slice(0, 6)));
  } catch {
    /* ignora */
  }
}

export function getFavTrucks(): RecentTruck[] {
  return read(FAV_KEY);
}

export function isFavTruck(id: string): boolean {
  return read(FAV_KEY).some((t) => t.id === id);
}

export function toggleFavTruck(t: { id: string; label: string; plate?: string | null }): boolean {
  const items = read(FAV_KEY);
  const exists = items.some((f) => f.id === t.id);
  if (exists) {
    save(FAV_KEY, items.filter((f) => f.id !== t.id));
    return false;
  }
  save(FAV_KEY, [...items, { id: t.id, label: t.label, plate: t.plate ?? null, at: Date.now() }]);
  return true;
}

export const RECENTS_CHANGED = "imperio:recents-changed";
export function notifyRecents() {
  window.dispatchEvent(new Event(RECENTS_CHANGED));
}
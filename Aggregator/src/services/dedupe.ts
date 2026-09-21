import type { ApiHotel, TaggedHotel } from '../types/hotel.js';

// pure/deterministic so it can run directly inside workflow code; groups by name, cheaper price wins, ties keep whichever list is merged first
export function dedupeHotels(hotelsA: TaggedHotel[], hotelsB: TaggedHotel[]): ApiHotel[] {
  const byName = new Map<string, TaggedHotel>();
  for (const hotel of [...hotelsA, ...hotelsB]) {
    const key = hotel.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || hotel.price < existing.price) {
      byName.set(key, hotel);
    }
  }
  return [...byName.values()].map(({ name, price, supplier, commisionPct }) => ({ name, price, supplier, commisionPct }));
}

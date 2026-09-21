import type { Supplier, SupplierHotel, TaggedHotel } from '../../types/hotel.js';

// hostnames match the docker-compose service names, not localhost
const SUPPLIER_A_URL = 'http://supplier-a:3000/supplierA/hotels';
const SUPPLIER_B_URL = 'http://supplier-b:3001/supplierB/hotels';

async function fetchAndTag(url: string, supplier: Supplier, city: string): Promise<TaggedHotel[]> {
  const response = await fetch(url);
  if (!response.ok) {
    // throwing (instead of swallowing to []) lets Temporal's activity retry policy handle transient failures
    throw new Error(`${supplier} responded with status ${response.status}`);
  }
  const hotels: SupplierHotel[] = await response.json();
  return hotels
    .filter((hotel) => hotel.city.toLowerCase() === city.toLowerCase())
    .map((hotel) => ({ ...hotel, supplier }));
}

export async function fetchSupplierAHotels(city: string): Promise<TaggedHotel[]> {
  return fetchAndTag(SUPPLIER_A_URL, 'supplier-a', city);
}

export async function fetchSupplierBHotels(city: string): Promise<TaggedHotel[]> {
  return fetchAndTag(SUPPLIER_B_URL, 'supplier-b', city);
}

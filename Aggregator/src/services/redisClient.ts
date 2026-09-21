import { Redis } from 'ioredis';
import type { ApiHotel } from '../types/hotel.js';

const TTL_SECONDS = 300;

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

// ioredis throws on unhandled 'error' events by default, which would crash the process on any connection blip
redis.on('error', (error) => {
  console.error('Redis client error:', error);
});

export function cacheKey(city: string): string {
  return `hotels:${city.trim().toLowerCase()}`;
}

export async function setCachedHotels(city: string, hotels: ApiHotel[]): Promise<void> {
  await redis.set(cacheKey(city), JSON.stringify(hotels), 'EX', TTL_SECONDS);
}

export async function getCachedHotels(city: string): Promise<ApiHotel[] | null> {
  const raw = await redis.get(cacheKey(city));
  return raw ? (JSON.parse(raw) as ApiHotel[]) : null;
}

export default redis;

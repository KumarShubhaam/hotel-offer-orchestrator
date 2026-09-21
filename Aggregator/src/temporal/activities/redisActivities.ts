import { setCachedHotels } from '../../services/redisClient.js';
import type { ApiHotel } from '../../types/hotel.js';

export async function cacheDedupedHotels(city: string, hotels: ApiHotel[]): Promise<void> {
  await setCachedHotels(city, hotels);
}

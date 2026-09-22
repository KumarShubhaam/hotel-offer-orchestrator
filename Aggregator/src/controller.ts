import { type Request, type Response, type NextFunction } from 'express';
import { runHotelComparisonWorkflow } from './temporal/client.js';
import { getCachedHotels } from './services/redisClient.js';
import type { ApiHotel } from './types/hotel.js';

class Controller {
  async getRequestedHotels(req: Request, res: Response, next: NextFunction){
    const {city, minPrice, maxPrice} = req.query;
    if (!city || typeof city !== 'string') {
      return res.status(400).send({msg: 'city query parameter is required'});
    }
    if (minPrice !== undefined && (typeof minPrice !== 'string' || Number.isNaN(Number(minPrice)))) {
      return res.status(400).send({msg: 'minPrice must be a number'});
    }
    if (maxPrice !== undefined && (typeof maxPrice !== 'string' || Number.isNaN(Number(maxPrice)))) {
      return res.status(400).send({msg: 'maxPrice must be a number'});
    }

    let hotels: ApiHotel[];
    const cached = await getCachedHotels(city).catch(() => null);
    if (cached) {
      hotels = cached;
    } else {
      try {
        hotels = await runHotelComparisonWorkflow(city);
      } catch (error) {
        console.error('hotelComparisonWorkflow failed:', error);
        return res.status(502).send({msg: 'Failed to fetch hotels via Temporal workflow'});
      }
    }

    if (minPrice === undefined && maxPrice === undefined) {
      return res.status(200).send(hotels);
    }

    const min = minPrice !== undefined ? Number(minPrice) : 0;
    const max = maxPrice !== undefined ? Number(maxPrice) : Number.POSITIVE_INFINITY;
    return res.status(200).send(hotels.filter((hotel) => hotel.price >= min && hotel.price <= max));
  }
}


export default Controller;
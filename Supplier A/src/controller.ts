import { type Request, type Response, type NextFunction } from 'express';
import { supplierA_Hotels } from './data.js';

class Controller {
  getHotels(req: Request, res: Response, next: NextFunction) {
    return res.status(200).send(supplierA_Hotels);
  }
}

export default Controller;
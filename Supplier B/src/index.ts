import express, { type Request, type Response, type NextFunction } from 'express';
import Controller from './controller.js';

const supplierB = express();

const controller = new Controller();

supplierB.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('Supplier B is running');
});

supplierB.get('/supplierB/hotels', (req: Request, res: Response, next: NextFunction) => {
  controller.getHotels(req, res, next);
});

supplierB.listen(3001, () => {
  console.log('Supplier B server is running on port 3001');
});

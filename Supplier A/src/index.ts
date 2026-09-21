import express, { type Request, type Response, type NextFunction } from 'express';
import Controller from './controller.js';

const supplierA = express();


const controller = new Controller();

supplierA.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('Supplier A is running');
});

supplierA.get('/supplierA/hotels', (req: Request, res: Response, next: NextFunction) => {
  controller.getHotels(req, res, next);
});

supplierA.listen(3000, () => {
  console.log('Supplier A server is running on port 3000');
});
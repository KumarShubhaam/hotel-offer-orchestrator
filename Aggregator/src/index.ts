import express, {type Request, type Response, type NextFunction } from 'express';
import Controller from './controller.js';


const aggregator = express();

const controller = new Controller();

aggregator.get('/', (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).send({msg: 'Welcome to Aggregator'})
});

aggregator.get('/api/hotels', (req: Request, res: Response, next: NextFunction) => {
  controller.getRequestedHotels(req, res, next);
});



aggregator.listen(4000, () => {
  console.log('Aggregator is listening on port 4000.')
})
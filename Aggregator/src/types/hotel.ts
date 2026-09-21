export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commisionPct: number;
}

export type Supplier = 'supplier-a' | 'supplier-b';

export interface TaggedHotel extends SupplierHotel {
  supplier: Supplier;
}

export interface ApiHotel {
  name: string;
  price: number;
  supplier: Supplier;
  commisionPct: number;
}

export type OrderStatus = 'pendiente' | 'en_preparacion' | 'en_camino' | 'entregado' | 'cancelado';

export interface Order {
  id?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  delivery_date: string;
  delivery_time: string;
  gps_url?: string;
  delivery_notes?: string;
  delivery_photo_url?: string;
  dedication?: string;
  client_name: string;
  client_phone: string;
  client_tax_id?: string;
  client_email?: string;
  price?: number;
  billed?: boolean;
  product_code: string;
  extras?: string;
  observations?: string;
  status: OrderStatus;
}
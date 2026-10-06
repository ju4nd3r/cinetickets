import { SERVICE_FEE_PERCENTAGE } from '@cinetickets/shared';
import { ValidationError } from './errors.js';

export interface SeatPricingInput {
  basePriceCents: number;
  discountPct: number;
}

export interface FoodPricingInput {
  priceCents: number;
  qty: number;
}

export interface OrderPricingResult {
  seatPrices: number[];
  subtotalEntradasCents: number;
  subtotalComidaCents: number;
  subtotalCents: number;
  feesCents: number;
  totalCents: number;
}

/**
 * Calcula el precio final de un asiento aplicando el descuento del tipo de entrada
 * Redondeo matemático estándar al centavo entero más cercano.
 */
export function calculateSeatPrice(basePriceCents: number, discountPct: number): number {
  if (basePriceCents < 0) {
    throw new ValidationError('El precio base del asiento no puede ser negativo');
  }
  if (discountPct < 0 || discountPct > 100) {
    throw new ValidationError('El porcentaje de descuento debe estar entre 0 y 100');
  }

  const multiplier = 1 - discountPct / 100;
  return Math.round(basePriceCents * multiplier);
}

/**
 * Calcula la estructura completa de precios de una orden:
 * subtotalEntradas = sum(precioAsiento)
 * subtotalComida = sum(precioComida * cantidad)
 * subtotal = subtotalEntradas + subtotalComida
 * cargoServicio = round(subtotalEntradas * 5%)
 * total = subtotal + cargoServicio
 */
export function calculateOrderPricing(
  seats: SeatPricingInput[],
  food: FoodPricingInput[] = [],
): OrderPricingResult {
  if (seats.length === 0) {
    throw new ValidationError('Una orden debe contener al menos un asiento');
  }

  const seatPrices = seats.map((s) => calculateSeatPrice(s.basePriceCents, s.discountPct));
  const subtotalEntradasCents = seatPrices.reduce((acc, curr) => acc + curr, 0);

  const subtotalComidaCents = food.reduce((acc, f) => {
    if (f.priceCents < 0) {
      throw new ValidationError('El precio de un producto no puede ser negativo');
    }
    if (f.qty <= 0) {
      throw new ValidationError('La cantidad de un producto debe ser mayor a 0');
    }
    return acc + f.priceCents * f.qty;
  }, 0);

  const subtotalCents = subtotalEntradasCents + subtotalComidaCents;
  const feesCents = Math.round(subtotalEntradasCents * SERVICE_FEE_PERCENTAGE);
  const totalCents = subtotalCents + feesCents;

  return {
    seatPrices,
    subtotalEntradasCents,
    subtotalComidaCents,
    subtotalCents,
    feesCents,
    totalCents,
  };
}

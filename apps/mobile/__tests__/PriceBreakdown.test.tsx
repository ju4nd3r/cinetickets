import React from 'react';
import { render } from '@testing-library/react-native';
import {
  PriceBreakdown,
  formatPrice,
  PriceBreakdownSeat,
  PriceBreakdownFood,
} from '../src/features/booking/components/PriceBreakdown';

describe('PriceBreakdown Component', () => {
  it('formats cents into readable currency correctly', () => {
    expect(formatPrice(100000)).toBe('$1000.00');
    expect(formatPrice(45000)).toBe('$450.00');
    expect(formatPrice(50)).toBe('$0.50');
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('renders breakdown with seats, ticket discounts, service fee and snacks', () => {
    const seats: PriceBreakdownSeat[] = [
      {
        id: 's1',
        row: 'A',
        number: 1,
        type: 'standard',
        ticketType: { id: 'adult', label: 'Adulto', discountPct: 0 },
        priceCents: 100000,
      },
      {
        id: 's2',
        row: 'A',
        number: 2,
        type: 'standard',
        ticketType: { id: 'child', label: 'Niño', discountPct: 30 },
        priceCents: 70000,
      },
    ];

    const food: PriceBreakdownFood[] = [
      {
        foodItemId: 'f1',
        name: 'Palomitas Grandes',
        size: 'Grande',
        qty: 2,
        priceCents: 65000,
      },
    ];

    const { getByText, getAllByText, getByTestId } = render(
      <PriceBreakdown seats={seats} food={food} />,
    );

    expect(getByTestId('price-breakdown-card')).toBeTruthy();
    expect(getByText('Resumen del Pedido')).toBeTruthy();
    expect(getByText('Entradas (2)')).toBeTruthy();
    expect(getByText('Asiento A1 (STANDARD)')).toBeTruthy();
    expect(getByText('Asiento A2 (STANDARD)')).toBeTruthy();
    expect(getByText('Niño (-30%)')).toBeTruthy();

    // Snacks
    expect(getByText('Snacks y Bebidas (1)')).toBeTruthy();
    expect(getByText('2x Palomitas Grandes')).toBeTruthy();
    expect(getByText('Tamaño: Grande')).toBeTruthy();

    // Totales:
    // Subtotal Entradas: 100000 + 70000 = 170000 -> $1700.00
    // Subtotal Comida: 65000 * 2 = 130000 -> $1300.00
    // Cargo de servicio 5%: round(170000 * 0.05) = 8500 -> $85.00
    // Total: 170000 + 130000 + 8500 = 308500 -> $3085.00
    expect(getByText('$1700.00')).toBeTruthy();
    expect(getAllByText('$1300.00').length).toBe(2);
    expect(getByText('$85.00')).toBeTruthy();
    expect(getByText('$3085.00')).toBeTruthy();
  });
});

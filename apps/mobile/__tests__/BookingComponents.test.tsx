import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SeatMap } from '../src/features/booking/components/SeatMap';
import { TicketTypeSelector } from '../src/features/booking/components/TicketTypeSelector';
import { HoldTimer } from '../src/features/booking/components/HoldTimer';
import { FoodCatalog } from '../src/features/booking/components/FoodCatalog';
import { SeatWithStatus, TicketType, Showtime, FoodItem } from '@cinetickets/shared';

describe('Booking Components', () => {
  const mockSeats: SeatWithStatus[] = [
    {
      id: 's-1',
      hallId: 'h1',
      row: 'A',
      number: 1,
      type: 'standard',
      x: 0,
      y: 0,
      status: 'available',
    },
    {
      id: 's-2',
      hallId: 'h1',
      row: 'A',
      number: 2,
      type: 'vip',
      x: 1,
      y: 0,
      status: 'available',
    },
    {
      id: 's-3',
      hallId: 'h1',
      row: 'A',
      number: 3,
      type: 'accessible',
      x: 2,
      y: 0,
      status: 'available',
    },
    {
      id: 's-4',
      hallId: 'h1',
      row: 'B',
      number: 1,
      type: 'standard',
      x: 0,
      y: 1,
      status: 'occupied',
    },
  ];

  describe('SeatMap', () => {
    it('renders screen bar, seat indicators, and handles seat selection', () => {
      const onToggleMock = jest.fn();
      const { getByText } = render(
        <SeatMap seats={mockSeats} selectedSeatIds={['s-1']} onToggleSeat={onToggleMock} />,
      );

      expect(getByText('PANTALLA')).toBeTruthy();
      expect(getByText('Estándar')).toBeTruthy();
      expect(getByText('VIP (★)')).toBeTruthy();
      expect(getByText('Accesible (♿)')).toBeTruthy();
      expect(getByText('Seleccionado')).toBeTruthy();
      expect(getByText('Ocupado')).toBeTruthy();

      // Selected seat renders ✓
      expect(getByText('✓')).toBeTruthy();

      // Accessible seat renders ♿
      expect(getByText('♿')).toBeTruthy();

      // VIP seat renders ★
      expect(getByText('★')).toBeTruthy();

      // Tap on available VIP seat
      fireEvent.press(getByText('★'));
      expect(onToggleMock).toHaveBeenCalledWith(mockSeats[1]);

      // Tap on occupied seat (should not fire because disabled)
      const occupiedIcon = getByText('✕');
      fireEvent.press(occupiedIcon);
      expect(onToggleMock).not.toHaveBeenCalledWith(mockSeats[3]);
    });
  });

  describe('TicketTypeSelector', () => {
    const mockTicketTypes: TicketType[] = [
      { id: 'adult', label: 'Adulto', discountPct: 0 },
      { id: 'child', label: 'Niño', discountPct: 30 },
      { id: 'senior', label: 'Senior', discountPct: 25 },
      { id: 'student', label: 'Estudiante', discountPct: 15 },
    ];

    const mockShowtime: Showtime = {
      id: 'st1',
      movieId: 'm1',
      hallId: 'h1',
      startsAt: '2026-10-06T18:00:00.000Z',
      language: 'Español',
      format: '2D',
      priceStandardCents: 450000,
      priceVipCents: 650000,
      priceAccessibleCents: 350000,
    };

    it('renders seat details, discounts and allows selecting ticket types', () => {
      const onSelectMock = jest.fn();
      const { getByText } = render(
        <TicketTypeSelector
          selectedSeats={[mockSeats[0]]}
          ticketTypes={mockTicketTypes}
          seatTicketTypes={{ 's-1': mockTicketTypes[0] }}
          onSelectTicketType={onSelectMock}
          showtime={mockShowtime}
        />,
      );

      expect(getByText('Tipo de Entrada por Asiento')).toBeTruthy();
      expect(getByText('A1')).toBeTruthy();
      expect(getByText('Asiento Estándar')).toBeTruthy();
      expect(getByText('Adulto')).toBeTruthy();
      expect(getByText('Niño')).toBeTruthy();
      expect(getByText('-30%')).toBeTruthy();

      // Select child ticket
      fireEvent.press(getByText('Niño'));
      expect(onSelectMock).toHaveBeenCalledWith('s-1', mockTicketTypes[1]);
    });
  });

  describe('HoldTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders formatted timer and calls onExpire when countdown reaches 0', () => {
      const onExpireMock = jest.fn();
      const expiresAt = new Date(Date.now() + 120 * 1000).toISOString(); // 2 minutes

      const { getByText } = render(<HoldTimer expiresAt={expiresAt} onExpire={onExpireMock} />);

      expect(getByText(/Asientos reservados por: 02:00/)).toBeTruthy();

      // Advance timer by 120 seconds
      act(() => {
        jest.advanceTimersByTime(120 * 1000);
      });

      expect(getByText('Tiempo de reserva expirado')).toBeTruthy();
      expect(onExpireMock).toHaveBeenCalled();
    });
  });

  describe('FoodCatalog', () => {
    const mockFoodItems: FoodItem[] = [
      {
        id: 'f1',
        name: 'Mega Balde',
        description: 'Palomitas saladas',
        category: 'popcorn',
        priceCents: 65000,
        imageUrl: 'https://example.com/p.jpg',
        sizes: ['Mediano', 'Grande'],
        available: true,
      },
      {
        id: 'f2',
        name: 'Coca Cola',
        description: 'Gaseosa fría',
        category: 'drink',
        priceCents: 45000,
        imageUrl: 'https://example.com/c.jpg',
        available: true,
      },
    ];

    it('renders categories, size chips, and handles add and qty changes', () => {
      const onAddMock = jest.fn();
      const onUpdateQtyMock = jest.fn();

      const { getByText } = render(
        <FoodCatalog
          foodItems={mockFoodItems}
          selectedFood={{
            'f1:Mediano': { foodItem: mockFoodItems[0], size: 'Mediano', qty: 2 },
          }}
          onAddFood={onAddMock}
          onUpdateQty={onUpdateQtyMock}
        />,
      );

      expect(getByText('Todo')).toBeTruthy();
      expect(getByText('Combos')).toBeTruthy();
      expect(getByText('Palomitas')).toBeTruthy();
      expect(getByText('Bebidas')).toBeTruthy();

      expect(getByText('Mega Balde')).toBeTruthy();
      expect(getByText('Coca Cola')).toBeTruthy();

      // Item f1 has qty 2
      expect(getByText('2')).toBeTruthy();
      expect(getByText('+')).toBeTruthy();
      expect(getByText('−')).toBeTruthy();

      // Increase qty
      fireEvent.press(getByText('+'));
      expect(onUpdateQtyMock).toHaveBeenCalledWith('f1', 'Mediano', 3);

      // Item f2 is not in selectedFood, so it has + Agregar
      fireEvent.press(getByText('+ Agregar'));
      expect(onAddMock).toHaveBeenCalledWith(mockFoodItems[1], null);
    });
  });
});

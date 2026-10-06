import { useBookingStore } from '../src/features/booking/stores/useBookingStore';
import { SeatWithStatus, TicketType, FoodItem, Showtime } from '@cinetickets/shared';

describe('useBookingStore', () => {
  beforeEach(() => {
    useBookingStore.getState().resetBooking();
  });

  const mockSeat = (
    id: string,
    number: number,
    type: 'standard' | 'vip' | 'accessible' = 'standard',
  ): SeatWithStatus => ({
    id,
    hallId: 'h1',
    row: 'A',
    number,
    type,
    x: number - 1,
    y: 0,
    status: 'available',
  });

  const mockTicketType: TicketType = {
    id: 'adult',
    label: 'Adulto',
    discountPct: 0,
  };

  const mockChildTicket: TicketType = {
    id: 'child',
    label: 'Niño',
    discountPct: 30,
  };

  const mockFoodItem: FoodItem = {
    id: 'f1',
    name: 'Combo Palomitas',
    description: 'Palomitas + Bebida',
    category: 'combo',
    priceCents: 100000,
    imageUrl: 'https://example.com/combo.jpg',
    sizes: ['Mediano', 'Grande'],
    available: true,
  };

  it('selects and deselects seats, assigning default ticket type', () => {
    const seat1 = mockSeat('s1', 1);
    const added = useBookingStore.getState().toggleSeat(seat1, mockTicketType);
    expect(added).toBe(true);

    let state = useBookingStore.getState();
    expect(state.selectedSeats).toHaveLength(1);
    expect(state.seatTicketTypes['s1']).toEqual(mockTicketType);

    // Toggle off
    const toggledOff = useBookingStore.getState().toggleSeat(seat1);
    expect(toggledOff).toBe(true);

    state = useBookingStore.getState();
    expect(state.selectedSeats).toHaveLength(0);
    expect(state.seatTicketTypes['s1']).toBeUndefined();
  });

  it('strictly enforces the 10-seat limit per order', () => {
    for (let i = 1; i <= 10; i++) {
      const success = useBookingStore.getState().toggleSeat(mockSeat(`s${i}`, i), mockTicketType);
      expect(success).toBe(true);
    }

    expect(useBookingStore.getState().selectedSeats).toHaveLength(10);

    // Intentar asiento 11 debe ser rechazado
    const seat11 = mockSeat('s11', 11);
    const rejected = useBookingStore.getState().toggleSeat(seat11, mockTicketType);
    expect(rejected).toBe(false);
    expect(useBookingStore.getState().selectedSeats).toHaveLength(10);
  });

  it('updates ticket type for a selected seat', () => {
    const seat = mockSeat('s1', 1);
    useBookingStore.getState().toggleSeat(seat, mockTicketType);
    useBookingStore.getState().setTicketTypeForSeat('s1', mockChildTicket);

    expect(useBookingStore.getState().seatTicketTypes['s1']).toEqual(mockChildTicket);
  });

  it('sets and clears hold state', () => {
    useBookingStore.getState().setHold('hld_123', '2026-10-06T18:10:00.000Z');
    let state = useBookingStore.getState();
    expect(state.holdId).toBe('hld_123');
    expect(state.holdExpiresAt).toBe('2026-10-06T18:10:00.000Z');

    useBookingStore.getState().clearHold();
    state = useBookingStore.getState();
    expect(state.holdId).toBeNull();
    expect(state.holdExpiresAt).toBeNull();
  });

  it('manages food items (add, update qty, remove)', () => {
    // Add item
    useBookingStore.getState().addFoodItem(mockFoodItem, 'Grande');
    let state = useBookingStore.getState();
    expect(state.selectedFood['f1:Grande']).toBeDefined();
    expect(state.selectedFood['f1:Grande'].qty).toBe(1);

    // Add again incrementing qty
    useBookingStore.getState().addFoodItem(mockFoodItem, 'Grande');
    state = useBookingStore.getState();
    expect(state.selectedFood['f1:Grande'].qty).toBe(2);

    // Update quantity
    useBookingStore.getState().updateFoodQty('f1', 'Grande', 4);
    state = useBookingStore.getState();
    expect(state.selectedFood['f1:Grande'].qty).toBe(4);

    // Update to 0 removes it
    useBookingStore.getState().updateFoodQty('f1', 'Grande', 0);
    state = useBookingStore.getState();
    expect(state.selectedFood['f1:Grande']).toBeUndefined();

    // Re-add and remove
    useBookingStore.getState().addFoodItem(mockFoodItem, 'Mediano');
    useBookingStore.getState().removeFoodItem('f1', 'Mediano');
    expect(useBookingStore.getState().selectedFood['f1:Mediano']).toBeUndefined();
  });

  it('resets complete booking state', () => {
    useBookingStore.getState().setShowtime({ id: 'st1' } as Showtime);
    useBookingStore.getState().toggleSeat(mockSeat('s1', 1));
    useBookingStore.getState().setHold('hld_1', 'time');
    useBookingStore.getState().addFoodItem(mockFoodItem);

    useBookingStore.getState().resetBooking();
    const state = useBookingStore.getState();
    expect(state.showtime).toBeNull();
    expect(state.selectedSeats).toHaveLength(0);
    expect(state.holdId).toBeNull();
    expect(Object.keys(state.selectedFood)).toHaveLength(0);
  });
});

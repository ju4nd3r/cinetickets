import { create } from 'zustand';
import {
  MAX_SEATS_PER_ORDER,
  SeatWithStatus,
  Showtime,
  TicketType,
  FoodItem,
} from '@cinetickets/shared';

export interface SelectedSeatTicket {
  seat: SeatWithStatus;
  ticketType: TicketType;
}

export interface SelectedFoodItem {
  foodItem: FoodItem;
  size?: string | null;
  qty: number;
}

export interface BookingState {
  showtime: Showtime | null;
  selectedSeats: SeatWithStatus[];
  seatTicketTypes: Record<string, TicketType>; // seatId -> TicketType
  holdId: string | null;
  holdExpiresAt: string | null;
  selectedFood: Record<string, SelectedFoodItem>; // foodItemId:size -> SelectedFoodItem

  // Acciones
  setShowtime: (showtime: Showtime) => void;
  toggleSeat: (seat: SeatWithStatus, defaultTicketType?: TicketType) => boolean;
  setTicketTypeForSeat: (seatId: string, ticketType: TicketType) => void;
  setHold: (holdId: string, expiresAt: string) => void;
  clearHold: () => void;
  addFoodItem: (foodItem: FoodItem, size?: string | null) => void;
  updateFoodQty: (foodItemId: string, size: string | null | undefined, qty: number) => void;
  removeFoodItem: (foodItemId: string, size?: string | null) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  showtime: null,
  selectedSeats: [],
  seatTicketTypes: {},
  holdId: null,
  holdExpiresAt: null,
  selectedFood: {},

  setShowtime: (showtime) => set({ showtime }),

  toggleSeat: (seat, defaultTicketType) => {
    const { selectedSeats, seatTicketTypes } = get();
    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (isAlreadySelected) {
      const nextSeats = selectedSeats.filter((s) => s.id !== seat.id);
      const nextTickets = { ...seatTicketTypes };
      delete nextTickets[seat.id];
      set({ selectedSeats: nextSeats, seatTicketTypes: nextTickets });
      return true;
    }

    if (selectedSeats.length >= MAX_SEATS_PER_ORDER) {
      return false; // Límite de 10 alcanzado
    }

    const nextSeats = [...selectedSeats, seat];
    const nextTickets = { ...seatTicketTypes };
    if (defaultTicketType) {
      nextTickets[seat.id] = defaultTicketType;
    }

    set({ selectedSeats: nextSeats, seatTicketTypes: nextTickets });
    return true;
  },

  setTicketTypeForSeat: (seatId, ticketType) => {
    set((state) => ({
      seatTicketTypes: {
        ...state.seatTicketTypes,
        [seatId]: ticketType,
      },
    }));
  },

  setHold: (holdId, expiresAt) => set({ holdId, holdExpiresAt: expiresAt }),

  clearHold: () => set({ holdId: null, holdExpiresAt: null }),

  addFoodItem: (foodItem, size = null) => {
    const key = `${foodItem.id}:${size || 'default'}`;
    set((state) => {
      const existing = state.selectedFood[key];
      const qty = existing ? existing.qty + 1 : 1;
      return {
        selectedFood: {
          ...state.selectedFood,
          [key]: { foodItem, size, qty },
        },
      };
    });
  },

  updateFoodQty: (foodItemId, size = null, qty) => {
    const key = `${foodItemId}:${size || 'default'}`;
    set((state) => {
      if (qty <= 0) {
        const next = { ...state.selectedFood };
        delete next[key];
        return { selectedFood: next };
      }
      const existing = state.selectedFood[key];
      if (!existing) return state;
      return {
        selectedFood: {
          ...state.selectedFood,
          [key]: { ...existing, qty },
        },
      };
    });
  },

  removeFoodItem: (foodItemId, size = null) => {
    const key = `${foodItemId}:${size || 'default'}`;
    set((state) => {
      const next = { ...state.selectedFood };
      delete next[key];
      return { selectedFood: next };
    });
  },

  resetBooking: () =>
    set({
      showtime: null,
      selectedSeats: [],
      seatTicketTypes: {},
      holdId: null,
      holdExpiresAt: null,
      selectedFood: {},
    }),
}));

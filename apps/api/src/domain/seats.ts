import { MAX_SEATS_PER_ORDER } from '@cinetickets/shared';
import { ValidationError } from './errors.js';

export function validateSeatSelection(seatIds: string[], maxLimit = MAX_SEATS_PER_ORDER): void {
  if (!seatIds || seatIds.length === 0) {
    throw new ValidationError('Debe seleccionar al menos un asiento');
  }

  if (seatIds.length > maxLimit) {
    throw new ValidationError(`No puede seleccionar más de ${maxLimit} asientos por compra`, {
      selectedCount: seatIds.length,
      maxLimit,
    });
  }

  const uniqueSeatIds = new Set(seatIds);
  if (uniqueSeatIds.size !== seatIds.length) {
    throw new ValidationError('No se permiten asientos duplicados en la selección');
  }
}

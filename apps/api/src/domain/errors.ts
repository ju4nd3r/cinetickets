import { ErrorCode, type ErrorCodeType } from '@cinetickets/shared';

export class DomainError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCodeType, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SeatUnavailableError extends DomainError {
  constructor(message = 'Uno o más asientos no se encuentran disponibles', details?: unknown) {
    super(message, ErrorCode.SEAT_UNAVAILABLE, 409, details);
    this.name = 'SeatUnavailableError';
  }
}

export class HoldExpiredError extends DomainError {
  constructor(message = 'La reserva temporal de asientos ha expirado', details?: unknown) {
    super(message, ErrorCode.HOLD_EXPIRED, 410, details);
    this.name = 'HoldExpiredError';
  }
}

export class PaymentDeclinedError extends DomainError {
  constructor(message = 'El pago fue rechazado por la entidad bancaria', details?: unknown) {
    super(message, ErrorCode.PAYMENT_DECLINED, 402, details);
    this.name = 'PaymentDeclinedError';
  }
}

export class InvalidOrderStateError extends DomainError {
  constructor(from: string, to: string) {
    super(
      `Transición de estado de orden inválida: de '${from}' hacia '${to}'`,
      ErrorCode.VALIDATION_ERROR,
      400,
      { from, to },
    );
    this.name = 'InvalidOrderStateError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(
      `${entity}${id ? ` con id '${id}'` : ''} no fue encontrado(a)`,
      ErrorCode.NOT_FOUND,
      404,
      { entity, id },
    );
    this.name = 'NotFoundError';
  }
}

import { Order } from '@cinetickets/shared';
import {
  OrderRepository,
  ShowtimeRepository,
  SeatHoldStore,
  PaymentGateway,
  CatalogRepository,
  Clock,
  PaymentDetails,
} from '../ports/index.js';
import {
  NotFoundError,
  HoldExpiredError,
  PaymentDeclinedError,
  ValidationError,
  DomainError,
} from '../../domain/errors.js';
import { calculateOrderPricing, SeatPricingInput } from '../../domain/pricing.js';
import { transitionOrder } from '../../domain/order-state-machine.js';

export interface CreateOrderInput {
  holdId: string;
  showtimeId: string;
  userId: string;
  idempotencyKey: string;
  seats: {
    seatId: string;
    ticketTypeId: string;
  }[];
  food?: {
    foodItemId: string;
    size?: string | null;
    qty: number;
  }[];
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly showtimeRepo: ShowtimeRepository,
    private readonly catalogRepo: CatalogRepository,
    private readonly seatHoldStore: SeatHoldStore,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    if (!input.idempotencyKey) {
      throw new ValidationError('La cabecera Idempotency-Key es obligatoria');
    }

    // 1. Idempotencia: Si ya existe orden con esta clave, retornarla sin duplicar
    const existing = await this.orderRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return existing;
    }

    // 2. Verificar función
    const showtime = await this.showtimeRepo.findById(input.showtimeId);
    if (!showtime) {
      throw new NotFoundError('Función', input.showtimeId);
    }

    const seatIds = input.seats.map((s) => s.seatId);

    // 3. Verificar hold en el store
    const isHoldValid = await this.seatHoldStore.verifyHold(
      input.showtimeId,
      input.holdId,
      seatIds,
    );
    if (!isHoldValid) {
      throw new HoldExpiredError('El hold de asientos no es válido o ha expirado');
    }

    // 4. Obtener tipos de asiento para precios base
    const seatMap = await this.showtimeRepo.getHallSeatMap(input.showtimeId);
    if (!seatMap) {
      throw new NotFoundError('Mapa de sala para la función', input.showtimeId);
    }
    const seatsById = new Map(seatMap.seats.map((s) => [s.id, s]));

    // 5. Obtener tipos de ticket para descuentos
    const ticketTypes = await this.catalogRepo.getTicketTypes();
    const ticketTypesById = new Map(ticketTypes.map((t) => [t.id, t]));

    const seatPricingInputs: SeatPricingInput[] = [];
    const orderSeatsToCreate: { seatId: string; ticketTypeId: string; priceCents: number }[] = [];

    for (const item of input.seats) {
      const seat = seatsById.get(item.seatId);
      if (!seat) {
        throw new NotFoundError(`Asiento '${item.seatId}' en la función`);
      }

      const ticketType = ticketTypesById.get(item.ticketTypeId);
      if (!ticketType) {
        throw new NotFoundError(`Tipo de entrada '${item.ticketTypeId}'`);
      }

      let basePrice = showtime.priceStandardCents;
      if (seat.type === 'vip') {
        basePrice = showtime.priceVipCents;
      } else if (seat.type === 'accessible') {
        basePrice = showtime.priceAccessibleCents;
      }

      seatPricingInputs.push({
        basePriceCents: basePrice,
        discountPct: ticketType.discountPct,
      });
    }

    // 6. Obtener comida y calcular precios
    const foodItems = await this.catalogRepo.getFoodItems();
    const foodItemsById = new Map(foodItems.map((f) => [f.id, f]));

    const foodPricingInputs = [];
    const orderFoodToCreate: {
      foodItemId: string;
      size?: string | null;
      qty: number;
      priceCents: number;
    }[] = [];

    if (input.food && input.food.length > 0) {
      for (const f of input.food) {
        const foodItem = foodItemsById.get(f.foodItemId);
        if (!foodItem) {
          throw new NotFoundError(`Producto de comida '${f.foodItemId}'`);
        }
        if (!foodItem.available) {
          throw new ValidationError(
            `El producto '${foodItem.name}' no está disponible actualmente`,
          );
        }

        foodPricingInputs.push({
          priceCents: foodItem.priceCents,
          qty: f.qty,
        });

        orderFoodToCreate.push({
          foodItemId: f.foodItemId,
          size: f.size,
          qty: f.qty,
          priceCents: foodItem.priceCents,
        });
      }
    }

    // 7. Calcular totales en servidor (fuente de verdad)
    const pricing = calculateOrderPricing(seatPricingInputs, foodPricingInputs);

    for (let i = 0; i < input.seats.length; i++) {
      orderSeatsToCreate.push({
        seatId: input.seats[i].seatId,
        ticketTypeId: input.seats[i].ticketTypeId,
        priceCents: pricing.seatPrices[i],
      });
    }

    // Hold expira a los 8 minutos o tiempo restante
    const expiresAt = new Date(this.clock.now().getTime() + 480 * 1000);

    // 8. Crear orden en repositorio
    return this.orderRepo.create({
      userId: input.userId,
      showtimeId: input.showtimeId,
      idempotencyKey: input.idempotencyKey,
      holdExpiresAt: expiresAt,
      subtotalCents: pricing.subtotalCents,
      feesCents: pricing.feesCents,
      totalCents: pricing.totalCents,
      seats: orderSeatsToCreate,
      food: orderFoodToCreate,
    });
  }
}

export interface PayOrderInput {
  orderId: string;
  paymentDetails: PaymentDetails;
  idempotencyKey: string;
}

export interface PayOrderResult {
  order: Order;
  qrCode: string;
  message: string;
}

export class PayOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly seatHoldStore: SeatHoldStore,
    private readonly paymentGateway: PaymentGateway,
    private readonly clock: Clock,
  ) {}

  async execute(input: PayOrderInput): Promise<PayOrderResult> {
    if (!input.idempotencyKey) {
      throw new ValidationError('La cabecera Idempotency-Key es obligatoria para procesar el pago');
    }

    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new NotFoundError('Orden', input.orderId);
    }

    // Idempotencia: si ya fue confirmada con éxito, devolver respuesta guardada
    if (order.status === 'CONFIRMED' && order.qrCode) {
      return {
        order,
        qrCode: order.qrCode,
        message: 'Pago ya procesado y confirmado con anterioridad',
      };
    }

    // Validar expiración del hold de la orden
    const now = this.clock.now();
    if (new Date(order.holdExpiresAt).getTime() <= now.getTime()) {
      transitionOrder(order.status, 'EXPIRED');
      await this.orderRepo.updateStatus(order.id, 'EXPIRED');
      throw new HoldExpiredError('El tiempo para completar el pago ha expirado');
    }

    // Transición a PAYMENT_PENDING
    transitionOrder(order.status, 'PAYMENT_PENDING');
    await this.orderRepo.updateStatus(order.id, 'PAYMENT_PENDING');

    // Procesar con la pasarela de pagos
    const paymentResult = await this.paymentGateway.process({
      orderId: order.id,
      amountCents: order.totalCents,
      paymentDetails: input.paymentDetails,
      idempotencyKey: input.idempotencyKey,
    });

    if (!paymentResult.success) {
      transitionOrder('PAYMENT_PENDING', 'FAILED');
      await this.orderRepo.updateStatus(order.id, 'FAILED');

      if (paymentResult.errorCode === 'PAYMENT_DECLINED') {
        throw new PaymentDeclinedError(
          paymentResult.errorMessage || 'Tarjeta rechazada por la entidad emisora',
        );
      }
      throw new DomainError(
        paymentResult.errorMessage || 'Error en pasarela de pagos',
        (paymentResult.errorCode as 'INTERNAL_ERROR') || 'INTERNAL_ERROR',
        500,
      );
    }

    // Pago exitoso: generar QR y confirmar orden
    const qrCode = `CT-QR-${order.id}-${paymentResult.transactionId || 'TX_APPROVED'}`;
    transitionOrder('PAYMENT_PENDING', 'CONFIRMED');
    const confirmedOrder = await this.orderRepo.updateStatus(order.id, 'CONFIRMED', qrCode);

    return {
      order: confirmedOrder,
      qrCode,
      message: 'Pago procesado exitosamente',
    };
  }
}

export class GetOrdersUseCase {
  constructor(private readonly orderRepo: OrderRepository) {}

  async execute(userId: string): Promise<Order[]> {
    return this.orderRepo.findByUserId(userId);
  }
}

export class GetOrderDetailUseCase {
  constructor(private readonly orderRepo: OrderRepository) {}

  async execute(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Orden', orderId);
    }
    return order;
  }
}

import {
  PaymentGateway,
  ProcessPaymentInput,
  ProcessPaymentOutput,
} from '../application/ports/index.js';

export class DeterministicPaymentGateway implements PaymentGateway {
  async process(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    const { cardNumber } = input.paymentDetails;
    const cleanCard = cardNumber.replace(/\s+/g, '');

    // Tarjeta terminada en 0000 -> rechazada
    if (cleanCard.endsWith('0000')) {
      return {
        success: false,
        errorCode: 'PAYMENT_DECLINED',
        errorMessage:
          'La tarjeta fue rechazada por la entidad bancaria emisora (fondos insuficientes o bloqueo)',
      };
    }

    // Tarjeta terminada en 1111 -> error de red simulado
    if (cleanCard.endsWith('1111')) {
      return {
        success: false,
        errorCode: 'PAYMENT_GATEWAY_TIMEOUT',
        errorMessage: 'Error de comunicación o timeout con la red de pagos bancaria',
      };
    }

    // Cualquier otra tarjeta -> aprobada
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return {
      success: true,
      transactionId: `TX-${Date.now()}-${randomSuffix}`,
    };
  }
}

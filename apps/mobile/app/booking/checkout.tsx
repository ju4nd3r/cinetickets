import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { calculateSeatPrice } from '@cinetickets/shared';
import { useBookingStore } from '../../src/features/booking/stores/useBookingStore';
import { PriceBreakdown } from '../../src/features/booking/components/PriceBreakdown';
import { HoldTimer } from '../../src/features/booking/components/HoldTimer';
import { apiClient, ApiError } from '../../src/api/client';

const checkoutSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  phone: z.string().optional(),
  cardNumber: z
    .string()
    .min(13, 'El número de tarjeta debe tener entre 13 y 19 dígitos')
    .max(19, 'Máximo 19 dígitos'),
  cardHolder: z.string().min(2, 'El nombre del titular es requerido'),
  expMonth: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Mes inválido (1-12)'),
  expYear: z.string().regex(/^(20[2-5][0-9]|[2-5][0-9])$/, 'Año inválido (ej. 2026 o 26)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV debe ser de 3 o 4 dígitos'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    showtime,
    selectedSeats,
    seatTicketTypes,
    selectedFood,
    holdId,
    holdExpiresAt,
    clearHold,
    resetBooking,
  } = useBookingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedSeats = useMemo(() => {
    return selectedSeats.map((seat) => {
      const ticketType = seatTicketTypes[seat.id] || {
        id: 'adult',
        label: 'Adulto',
        discountPct: 0,
      };
      let basePrice = showtime?.priceStandardCents || 0;
      if (seat.type === 'vip') basePrice = showtime?.priceVipCents || 0;
      if (seat.type === 'accessible') basePrice = showtime?.priceAccessibleCents || 0;
      const priceCents = calculateSeatPrice(basePrice, ticketType.discountPct);
      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        ticketType,
        priceCents,
      };
    });
  }, [selectedSeats, seatTicketTypes, showtime]);

  const foodList = useMemo(() => {
    return Object.values(selectedFood || {}).map((item) => ({
      foodItemId: item.foodItem.id,
      name: item.foodItem.name,
      size: item.size,
      qty: item.qty,
      priceCents: item.foodItem.priceCents,
    }));
  }, [selectedFood]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    defaultValues: {
      name: 'Demo Usuario',
      email: 'demo@cinetickets.test',
      phone: '5551234567',
      cardNumber: '4532000000001234',
      cardHolder: 'DEMO USUARIO',
      expMonth: '12',
      expYear: '2027',
      cvv: '123',
    },
  });

  const fillValidCard = () => {
    setValue('cardNumber', '4532000000001234');
    setValue('cardHolder', 'DEMO USUARIO');
    setValue('expMonth', '12');
    setValue('expYear', '2027');
    setValue('cvv', '123');
    setErrorMessage(null);
  };

  const fillDeclinedCard = () => {
    setValue('cardNumber', '4532000000000000');
    setValue('cardHolder', 'DEMO RECHAZO');
    setValue('expMonth', '08');
    setValue('expYear', '2026');
    setValue('cvv', '999');
    setErrorMessage(null);
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!showtime || selectedSeats.length === 0 || !holdId) {
      Alert.alert('Error', 'No hay asientos seleccionados o la reserva expiró.');
      return;
    }

    const validation = checkoutSchema.safeParse(data);
    if (!validation.success) {
      setErrorMessage('Por favor verifica los datos ingresados en el formulario.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Crear Orden con clave de idempotencia única
      const orderIdempotencyKey = `ord-${holdId}`;
      const order = await apiClient.createOrder(
        {
          holdId,
          showtimeId: showtime.id,
          customer: {
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
          },
          seats: formattedSeats.map((s) => ({
            seatId: s.id,
            ticketTypeId: s.ticketType.id,
          })),
          food: foodList.map((f) => ({
            foodItemId: f.foodItemId,
            size: f.size || undefined,
            qty: f.qty,
          })),
        },
        orderIdempotencyKey,
      );

      // 2. Procesar Pago Simulado
      const payIdempotencyKey = `pay-${order.id}`;
      const cleanCard = data.cardNumber.replace(/\s+/g, '');
      const year = data.expYear.length === 2 ? Number(`20${data.expYear}`) : Number(data.expYear);

      await apiClient.payOrder(
        order.id,
        {
          cardNumber: cleanCard,
          cardHolderName: data.cardHolder,
          expMonth: Number(data.expMonth),
          expYear: year,
          cvv: data.cvv,
        },
        payIdempotencyKey,
      );

      // 3. Éxito: limpiar store y redirigir a confirmación
      resetBooking();
      router.replace({
        pathname: '/booking/confirmation',
        params: { orderId: order.id },
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === 'PAYMENT_DECLINED') {
          setErrorMessage(
            'Pago rechazado por el banco emisor (Tarjeta terminada en 0000). Por favor utiliza otra tarjeta.',
          );
        } else if (err.code === 'HOLD_EXPIRED') {
          setErrorMessage(
            'Tu tiempo de reserva ha expirado. Por favor vuelve a seleccionar tus asientos.',
          );
          clearHold();
        } else if (err.code === 'SEAT_UNAVAILABLE') {
          setErrorMessage('Uno o más asientos seleccionados ya no están disponibles.');
        } else {
          setErrorMessage(err.message || 'Ocurrió un error al procesar la compra.');
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Error inesperado';
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showtime || selectedSeats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎟️</Text>
        <Text style={styles.emptyTitle}>Sin asientos seleccionados</Text>
        <Text style={styles.emptyText}>No has seleccionado asientos para realizar la compra.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.primaryButtonText}>Ir a la cartelera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Resumen y Pago',
          headerBackTitle: 'Atrás',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Temporizador */}
        {holdExpiresAt && (
          <HoldTimer
            expiresAt={holdExpiresAt}
            onExpire={() => {
              clearHold();
              Alert.alert('Tiempo Expirado', 'Tu reserva de asientos ha expirado.', [
                { text: 'Entendido', onPress: () => router.replace('/') },
              ]);
            }}
          />
        )}

        {/* Mensaje de Error si ocurrió alguno */}
        {errorMessage && (
          <View style={styles.errorBanner} testID="checkout-error-banner">
            <Text style={styles.errorBannerIcon}>⚠️</Text>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Resumen de Precios */}
        <PriceBreakdown seats={formattedSeats} food={foodList} />

        {/* Datos del Comprador */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Datos del Comprador</Text>

          <Text style={styles.label}>Nombre completo *</Text>
          <Controller
            control={control}
            name="name"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Juan Pérez"
                placeholderTextColor="#64748b"
              />
            )}
          />
          {errors.name && <Text style={styles.fieldError}>{errors.name.message}</Text>}

          <Text style={styles.label}>Correo electrónico *</Text>
          <Controller
            control={control}
            name="email"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="juan@ejemplo.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

          <Text style={styles.label}>Teléfono (opcional)</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="55 1234 5678"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
              />
            )}
          />
        </View>

        {/* Pasarela de Pago Simulada */}
        <View style={styles.formCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>Método de Pago</Text>
            <Text style={styles.cardBadge}>Simulado</Text>
          </View>

          {/* Botones de prueba rápida */}
          <View style={styles.quickFillContainer}>
            <Text style={styles.quickFillTitle}>Pruebas determinísticas:</Text>
            <View style={styles.quickFillButtons}>
              <TouchableOpacity
                style={[styles.chipButton, styles.chipSuccess]}
                onPress={fillValidCard}
              >
                <Text style={styles.chipText}>✓ Tarjeta Válida</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chipButton, styles.chipDanger]}
                onPress={fillDeclinedCard}
              >
                <Text style={styles.chipText}>✕ Termina 0000 (Rechazo)</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Número de tarjeta *</Text>
          <Controller
            control={control}
            name="cardNumber"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.cardNumber && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="4532 0000 0000 1234"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            )}
          />
          {errors.cardNumber && <Text style={styles.fieldError}>{errors.cardNumber.message}</Text>}

          <Text style={styles.label}>Titular de la tarjeta *</Text>
          <Controller
            control={control}
            name="cardHolder"
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.cardHolder && styles.inputError]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="JUAN PEREZ"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
              />
            )}
          />
          {errors.cardHolder && <Text style={styles.fieldError}>{errors.cardHolder.message}</Text>}

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Mes (MM) *</Text>
              <Controller
                control={control}
                name="expMonth"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.expMonth && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="12"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                )}
              />
              {errors.expMonth && <Text style={styles.fieldError}>{errors.expMonth.message}</Text>}
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>Año (AAAA) *</Text>
              <Controller
                control={control}
                name="expYear"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.expYear && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="2027"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                )}
              />
              {errors.expYear && <Text style={styles.fieldError}>{errors.expYear.message}</Text>}
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>CVV *</Text>
              <Controller
                control={control}
                name="cvv"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.cvv && styles.inputError]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="123"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                )}
              />
              {errors.cvv && <Text style={styles.fieldError}>{errors.cvv.message}</Text>}
            </View>
          </View>
        </View>

        {/* Botón de Pagar */}
        <TouchableOpacity
          style={[styles.payButton, isSubmitting && styles.payButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Confirmar y pagar orden"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.payButtonText}>Pagar Pedido</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: '#4c0519',
    borderColor: '#f43f5e',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorBannerIcon: {
    fontSize: 20,
  },
  errorBannerText: {
    color: '#fecdd3',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    backgroundColor: '#131d2e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  cardBadge: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  quickFillContainer: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  quickFillTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '600',
  },
  quickFillButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chipButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipSuccess: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  chipDanger: {
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0b0f19',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputError: {
    borderColor: '#f43f5e',
  },
  fieldError: {
    color: '#fb7185',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfCol: {
    flex: 1,
  },
  payButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../src/api/client';
import { FoodCatalog } from '../../src/features/booking/components/FoodCatalog';
import { HoldTimer } from '../../src/features/booking/components/HoldTimer';
import { useBookingStore } from '../../src/features/booking/stores/useBookingStore';

export default function FoodSelectionScreen() {
  const router = useRouter();
  const { holdExpiresAt, clearHold, selectedFood, addFoodItem, updateFoodQty } = useBookingStore();

  const {
    data: foodItems,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['foodCatalog'],
    queryFn: () => apiClient.getFoodItems(),
  });

  const totalFoodItemsCount = Object.values(selectedFood).reduce((acc, curr) => acc + curr.qty, 0);

  const totalFoodCents = Object.values(selectedFood).reduce(
    (acc, curr) => acc + curr.foodItem.priceCents * curr.qty,
    0,
  );

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  };

  const handleContinue = () => {
    router.push('/booking/checkout');
  };

  const handleSkip = () => {
    router.push('/booking/checkout');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Snacks y Bebidas',
          headerBackTitle: 'Asientos',
        }}
      />
      <View style={styles.container}>
        {/* Temporizador de Hold */}
        {holdExpiresAt && (
          <HoldTimer
            expiresAt={holdExpiresAt}
            onExpire={() => {
              clearHold();
              Alert.alert(
                'Tiempo Expirado',
                'Tu reserva de asientos ha expirado. Volverás a la cartelera.',
                [{ text: 'OK', onPress: () => router.replace('/') }],
              );
            }}
          />
        )}

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.headerBanner}>
            <Text style={styles.headerTitle}>¿Deseas agregar comida o bebida?</Text>
            <Text style={styles.headerSubtitle}>
              Combos, palomitas calientes, bebidas y golosinas para disfrutar tu función.
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#e11d48" />
              <Text style={styles.loadingText}>Cargando catálogo de snacks...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Error al cargar snacks</Text>
              <Text style={styles.errorMessage}>
                {error instanceof Error ? error.message : 'Error desconocido'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FoodCatalog
              foodItems={foodItems || []}
              selectedFood={selectedFood}
              onAddFood={addFoodItem}
              onUpdateQty={updateFoodQty}
            />
          )}
        </ScrollView>

        {/* Barra inferior */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Saltar selección de comida"
          >
            <Text style={styles.skipButtonText}>Saltar comida</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel={`Continuar al pago con ${totalFoodItemsCount} productos por ${formatPrice(totalFoodCents)}`}
          >
            <Text style={styles.continueButtonText}>
              {totalFoodItemsCount > 0
                ? `Continuar (${formatPrice(totalFoodCents)}) ▶`
                : 'Continuar ▶'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollArea: {
    flex: 1,
  },
  headerBanner: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  skipButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

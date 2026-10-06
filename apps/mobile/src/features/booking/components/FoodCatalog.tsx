import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { FoodItem } from '@cinetickets/shared';
import { SelectedFoodItem } from '../stores/useBookingStore';

export interface FoodCatalogProps {
  foodItems: FoodItem[];
  selectedFood: Record<string, SelectedFoodItem>;
  onAddFood: (foodItem: FoodItem, size?: string | null) => void;
  onUpdateQty: (foodItemId: string, size: string | null | undefined, qty: number) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Todo' },
  { id: 'combo', label: 'Combos' },
  { id: 'popcorn', label: 'Palomitas' },
  { id: 'drink', label: 'Bebidas' },
  { id: 'candy', label: 'Dulces' },
];

export function FoodCatalog({ foodItems, selectedFood, onAddFood, onUpdateQty }: FoodCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  const filteredItems = foodItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
  };

  const handleSelectSize = (itemId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: size }));
  };

  return (
    <View style={styles.container}>
      {/* Selector de Categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(cat.id)}
              accessibilityRole="button"
              accessibilityLabel={`Categoría ${cat.label}`}
            >
              <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de Productos */}
      <View style={styles.itemsList}>
        {filteredItems.map((item) => {
          const currentSize =
            selectedSizes[item.id] || (item.sizes && item.sizes.length > 0 ? item.sizes[0] : null);
          const key = `${item.id}:${currentSize || 'default'}`;
          const currentQty = selectedFood[key]?.qty || 0;

          return (
            <View key={item.id} style={styles.itemCard}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.itemImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.itemPrice}>{formatPrice(item.priceCents)}</Text>

                {/* Tamaños si están disponibles */}
                {item.sizes && item.sizes.length > 0 && (
                  <View style={styles.sizesRow}>
                    {item.sizes.map((s) => {
                      const isSizeActive = currentSize === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.sizeChip, isSizeActive && styles.sizeChipActive]}
                          onPress={() => handleSelectSize(item.id, s)}
                          accessibilityRole="radio"
                          accessibilityLabel={`Tamaño ${s} para ${item.name}`}
                        >
                          <Text style={[styles.sizeText, isSizeActive && styles.sizeTextActive]}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Controles de Cantidad */}
                <View style={styles.actionRow}>
                  {currentQty === 0 ? (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => onAddFood(item, currentSize)}
                      accessibilityRole="button"
                      accessibilityLabel={`Agregar ${item.name} a la orden`}
                    >
                      <Text style={styles.addButtonText}>+ Agregar</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => onUpdateQty(item.id, currentSize, currentQty - 1)}
                        accessibilityRole="button"
                        accessibilityLabel={`Disminuir cantidad de ${item.name}`}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{currentQty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => onUpdateQty(item.id, currentSize, currentQty + 1)}
                        accessibilityRole="button"
                        accessibilityLabel={`Aumentar cantidad de ${item.name}`}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#e11d48',
    borderColor: '#f43f5e',
  },
  categoryText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemImage: {
    width: 100,
    height: 120,
    backgroundColor: '#334155',
  },
  itemContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  itemDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34d399',
    marginTop: 4,
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  sizeChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sizeChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
  },
  sizeText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  sizeTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  addButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  qtyValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
});

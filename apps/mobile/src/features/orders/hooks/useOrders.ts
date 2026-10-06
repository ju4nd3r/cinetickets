import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { Order } from '@cinetickets/shared';

export function useOrders(userId?: string) {
  return useQuery<Order[]>({
    queryKey: ['orders', userId],
    queryFn: () => apiClient.getOrders(userId),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useOrder(orderId: string) {
  return useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.getOrder(orderId),
    enabled: Boolean(orderId),
  });
}

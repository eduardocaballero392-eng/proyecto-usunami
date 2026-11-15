import api from './axios.config';
import { Pedido, CreatePedidoDto } from '../types';

export const pedidosApi = {
  create: async (data: CreatePedidoDto): Promise<Pedido> => {
    const response = await api.post('/pedidos', data);
    return response.data;
  },

  getMisPedidos: async (): Promise<Pedido[]> => {
    const response = await api.get('/pedidos/mis-pedidos');
    return response.data;
  },

  getById: async (id: number): Promise<Pedido> => {
    const response = await api.get(`/pedidos/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<CreatePedidoDto>): Promise<Pedido> => {
    const response = await api.put(`/pedidos/${id}`, data);
    return response.data;
  },

  anular: async (id: number): Promise<void> => {
    await api.put(`/pedidos/${id}/anular`);
  },
};

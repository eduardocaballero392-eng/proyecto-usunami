import api from './axios.config';
import { Producto, Categoria } from '../types';

export const productosApi = {
  getAll: async (): Promise<Producto[]> => {
    const response = await api.get('/productos');
    return response.data;
  },

  getCategorias: async (): Promise<Categoria[]> => {
    const response = await api.get('/productos/categorias');
    return response.data;
  },

  getById: async (id: number): Promise<Producto> => {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },
};

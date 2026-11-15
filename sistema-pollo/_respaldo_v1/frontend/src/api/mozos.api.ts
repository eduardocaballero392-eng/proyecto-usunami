import api from './axios.config';
import { Mozo } from '../types';

export const mozosApi = {
  getAll: async (): Promise<Mozo[]> => {
    const response = await api.get('/mozos');
    return response.data;
  },

  getToken: async (mozoId: number): Promise<{ token: string; mozo: Mozo }> => {
    const response = await api.post('/mozos/token', { mozoId });
    return response.data;
  },
};

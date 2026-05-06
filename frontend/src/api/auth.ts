import client from './client';
import { User } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { email, password }).then(r => r.data);

export const getMe = () =>
  client.get<User>('/auth/me').then(r => r.data);

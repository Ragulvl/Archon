export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  services: {
    database: 'ok' | 'error';
    storage: 'ok' | 'error';
    ai: 'ok' | 'error';
  };
}

import { WS_EVENTS, WS_CLIENT_EVENTS } from '../constants/api.constants';

export type WsEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];
export type WsClientEventName = typeof WS_CLIENT_EVENTS[keyof typeof WS_CLIENT_EVENTS];


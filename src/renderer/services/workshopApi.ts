import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { TallerSettings } from '@/types';

const API_BASE = `http://localhost:3456`;

/**
 * RTK Query API para la configuración del taller
 */
export const workshopApi = createApi({
  reducerPath: 'workshopApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ['Workshop'],
  endpoints: (builder) => ({
    /** Obtener configuración actual del taller */
    getWorkshop: builder.query<TallerSettings, void>({
      query: () => '/api/workshop',
      providesTags: ['Workshop'],
    }),

    /** Actualizar configuración del taller */
    updateWorkshop: builder.mutation<void, Partial<TallerSettings>>({
      query: (body) => ({
        url: '/api/workshop',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Workshop'],
    }),
  }),
});

export const { useGetWorkshopQuery, useUpdateWorkshopMutation } = workshopApi;

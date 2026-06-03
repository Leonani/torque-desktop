import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { CategoryWithSubs } from '@/types';

/**
 * API slice para gestión de categorías y subcategorías usando RTK Query
 */
export const categoryApi = createApi({
  reducerPath: 'categoryApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3456/api',
  }),
  tagTypes: ['Category'],
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryWithSubs[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),

    addCategory: builder.mutation<CategoryWithSubs, { name: string }>({
      query: (data) => ({
        url: '/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),

    addSubcategory: builder.mutation<{ _id: string; name: string; categoryId: string }, { categoryId: string; name: string }>({
      query: (data) => ({
        url: '/categories/subcategories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useAddSubcategoryMutation,
} = categoryApi;

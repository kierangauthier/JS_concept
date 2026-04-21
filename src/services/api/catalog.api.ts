import { http } from './http';
import type { Company } from '@/types';

export interface CatalogCategory {
  id: string;
  name: string;
  sortOrder: number;
  productCount: number;
}

export interface CatalogProduct {
  id: string;
  reference: string;
  designation: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  company: Company;
}

export interface CreateProductPayload {
  reference: string;
  designation: string;
  unit: string;
  salePrice: number;
  costPrice?: number;
  categoryId?: string;
}

export interface UpdateProductPayload {
  reference?: string;
  designation?: string;
  unit?: string;
  salePrice?: number;
  costPrice?: number;
  categoryId?: string;
  isActive?: boolean;
}

export interface CreateCategoryPayload {
  name: string;
  sortOrder?: number;
}

export const catalogApi = {
  // Categories
  listCategories: (): Promise<CatalogCategory[]> =>
    http.get<CatalogCategory[]>('/catalog/categories'),

  createCategory: (data: CreateCategoryPayload): Promise<CatalogCategory> =>
    http.post<CatalogCategory>('/catalog/categories', data),

  // Products
  listProducts: (params?: { search?: string; categoryId?: string }): Promise<CatalogProduct[]> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    const query = qs.toString();
    return http.get<CatalogProduct[]>(`/catalog${query ? `?${query}` : ''}`);
  },

  getProduct: (id: string): Promise<CatalogProduct> =>
    http.get<CatalogProduct>(`/catalog/${id}`),

  createProduct: (data: CreateProductPayload): Promise<CatalogProduct> =>
    http.post<CatalogProduct>('/catalog', data),

  updateProduct: (id: string, data: UpdateProductPayload): Promise<CatalogProduct> =>
    http.patch<CatalogProduct>(`/catalog/${id}`, data),

  deleteProduct: (id: string): Promise<{ deleted: boolean }> =>
    http.delete<{ deleted: boolean }>(`/catalog/${id}`),

  importCsv: async (file: File): Promise<{ imported: number; skipped: number; total: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const res = await fetch('/api/catalog/import', {
      method: 'POST',
      headers: {
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Erreur import CSV');
    }
    return res.json();
  },
};

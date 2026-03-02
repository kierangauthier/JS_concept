import { http } from './http';

export interface SearchResults {
  clients: Array<{ id: string; name: string; email: string; city: string }>;
  quotes: Array<{ id: string; reference: string; subject: string; status: string }>;
  jobs: Array<{ id: string; reference: string; title: string; status: string }>;
  invoices: Array<{ id: string; reference: string; status: string; amount: number }>;
}

export const searchApi = {
  search: (query: string): Promise<SearchResults> =>
    http.get(`/search?q=${encodeURIComponent(query)}`),
};

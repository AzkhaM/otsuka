import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product';

const API_URL = 'http://localhost:3000/products';

@Service()
export class ProductService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<Product[]>(API_URL);
  }

  create(product: Omit<Product, 'id'>) {
    return this.http.post<Product>(API_URL, product);
  }

  update(id: number, product: Omit<Product, 'id'>) {
    return this.http.put<Product>(`${API_URL}/${id}`, product);
  }

  delete(id: number) {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ProductService } from '../../services/product';
import { Product } from '../../models/product';

const EMPTY_FORM = { name: '', category: '', stock: 0, price: 0 };

@Component({
  selector: 'app-product-list',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private productService = inject(ProductService);

  products = signal<Product[]>([]);
  form = { ...EMPTY_FORM };
  editingId = signal<number | null>(null);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.productService.list().subscribe((products) => this.products.set(products));
  }

  submit() {
    const id = this.editingId();
    const request = id
      ? this.productService.update(id, this.form)
      : this.productService.create(this.form);

    request.subscribe(() => {
      this.form = { ...EMPTY_FORM };
      this.editingId.set(null);
      this.reload();
    });
  }

  edit(product: Product) {
    this.editingId.set(product.id);
    this.form = { name: product.name, category: product.category, stock: product.stock, price: product.price };
  }

  cancelEdit() {
    this.editingId.set(null);
    this.form = { ...EMPTY_FORM };
  }

  remove(id: number) {
    this.productService.delete(id).subscribe(() => this.reload());
  }
}

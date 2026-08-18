import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  template: `
    <div class="empty">
      <div class="empty-icon">···</div>
      <h2>{{ title }}</h2>
      <p>Halaman ini belum memiliki konten. Menu sudah tersedia di sidebar.</p>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 80px 20px;
        background: var(--surface);
        border: 1px dashed var(--border);
        border-radius: var(--radius);
        color: var(--text-muted);
      }
      .empty-icon {
        font-size: 28px;
        letter-spacing: 4px;
        color: var(--text-muted);
      }
      h2 {
        margin: 8px 0 4px;
        color: var(--text);
      }
      p {
        margin: 0;
        font-size: 14px;
      }
    `,
  ],
})
export class Placeholder {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] ?? '';
}

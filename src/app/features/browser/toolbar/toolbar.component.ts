import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-toolbar',
  imports: [FormsModule],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
})
export class ToolbarComponent {
  readonly currentUrl = input('');
  readonly navigate = output<string>();

  urlInput = '';

  go(): void {
    let url = this.urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    this.navigate.emit(url);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.go();
  }
}

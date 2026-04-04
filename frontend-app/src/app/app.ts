import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = 'frontend-app';

  constructor() {
    console.log('%c🟢 APP COMPONENT CARGADO', 'color: green; font-size: 16px; font-weight: bold;');
  }
}

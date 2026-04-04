import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

console.log('%c🟢 main.ts - Iniciando bootstrap', 'color: green; font-size: 16px;');

bootstrapApplication(App, appConfig)
  .then(() => {
    console.log('%c✅ Bootstrap completado exitosamente', 'color: green; font-size: 16px;');
  })
  .catch((err) => {
    console.error('%c❌ Error en bootstrap:', 'color: red; font-size: 16px;', err);
  });

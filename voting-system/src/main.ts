import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection(),
    ...appConfig.providers!
  ],
}).catch(err => console.error(err));
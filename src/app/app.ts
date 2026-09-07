import { Component } from '@angular/core';
import { TransportForm } from './components/transport-form/transport-form';

@Component({
  selector: 'app-root',
  imports: [TransportForm],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}

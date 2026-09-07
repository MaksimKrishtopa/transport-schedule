import { Component, input } from '@angular/core';
import { TripView } from '../../models/trip-view';

@Component({
  selector: 'app-trip-card',
  templateUrl: './trip-card.html',
  styleUrl: './trip-card.css',
})
export class TripCard {
  readonly trip = input.required<TripView>();
}

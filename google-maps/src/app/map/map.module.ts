import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapRoutingModule } from './map-routing.module';
import { GoogleMapsModule } from '@angular/google-maps';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    MapRoutingModule.components
  ],
  imports: [
    CommonModule,
    MapRoutingModule,
    GoogleMapsModule,
    FormsModule
  ]
})
export class MapModule { }

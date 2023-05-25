import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'navagis-map',
    loadChildren: () => import('./map/map.module').then(m => m.MapModule)
  },
  {
    path: '**',
    redirectTo: 'navagis-map',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

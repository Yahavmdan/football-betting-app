import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/groups',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'groups',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/groups/groups-list.component').then(m => m.GroupsListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('./components/groups/create-group.component').then(m => m.CreateGroupComponent)
      },
      {
        path: 'join',
        loadComponent: () => import('./components/groups/join-group.component').then(m => m.JoinGroupComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./components/groups/group-detail.component').then(m => m.GroupDetailComponent)
      }
    ]
  },
  {
    path: 'matches',
    canActivate: [authGuard],
    children: [
      {
        path: 'manage',
        loadComponent: () => import('./components/matches/manage-matches.component').then(m => m.ManageMatchesComponent)
      }
    ]
  },
  {
    path: 'bets',
    canActivate: [authGuard],
    children: [
      {
        path: 'place',
        loadComponent: () => import('./components/bets/place-bet.component').then(m => m.PlaceBetComponent)
      }
    ]
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: '**',
    redirectTo: '/groups'
  }
];

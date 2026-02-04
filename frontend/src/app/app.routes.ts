import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

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
    // Shareable join link - redirects to join page with code pre-filled
    path: 'join/:code',
    canActivate: [authGuard],
    loadComponent: () => import('./components/groups/join-group/join-group.component').then(m => m.JoinGroupComponent)
  },
  {
    path: 'groups',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/groups/groups-list/groups-list.component').then(m => m.GroupsListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('./components/groups/create-group/create-group.component').then(m => m.CreateGroupComponent)
      },
      {
        path: 'join',
        loadComponent: () => import('./components/groups/join-group/join-group.component').then(m => m.JoinGroupComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./components/groups/group-detail/group-detail.component').then(m => m.GroupDetailComponent)
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
    path: 'game',
    canActivate: [authGuard],
    loadComponent: () => import('./components/games/football-game/football-game.component').then(m => m.FootballGameComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: 'feedback',
        loadComponent: () => import('./components/admin/admin-feedback/admin-feedback.component').then(m => m.AdminFeedbackComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/groups'
  }
];

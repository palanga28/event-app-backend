import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import MePage from '../pages/MePage'
import UserProfilePage from '../pages/UserProfilePage'
import SearchUsersPage from '../pages/SearchUsersPage'
import SearchEventsPage from '../pages/SearchEventsPage'
import EventDetailPage from '../pages/EventDetailPage'
import EventSharePage from '../pages/EventSharePage'
import CreateEventPage from '../pages/CreateEventPage'
import MyEventsPage from '../pages/MyEventsPage'
import MyTicketsPage from '../pages/MyTicketsPage'
import MyFavoritesPage from '../pages/MyFavoritesPage'
import MeNotificationsPage from '../pages/MeNotificationsPage'
import MyChallengesPage from '../pages/MyChallengesPage'
import ModeratorReportsPage from '../pages/moderator/ModeratorReportsPage'
import ModeratorActivityPage from '../pages/moderator/ModeratorActivityPage'
import ModeratorUsersReportedPage from '../pages/moderator/ModeratorUsersReportedPage'
import ModeratorWarnUserPage from '../pages/moderator/ModeratorWarnUserPage'
import ModeratorChallengesPage from '../pages/moderator/ModeratorChallengesPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminStatsPage from '../pages/admin/AdminStatsPage'
import AdminEventsPage from '../pages/admin/AdminEventsPage'
import AdminReportsPage from '../pages/admin/AdminReportsPage'
import AdminLogsPage from '../pages/admin/AdminLogsPage'
import AdminChallengesPage from '../pages/admin/AdminChallengesPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import AdminSettingsPage from '../pages/admin/AdminSettingsPage'
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage'
import AdminTicketsPage from '../pages/admin/AdminTicketsPage'
import AdminModerationPage from '../pages/admin/AdminModerationPage'
import AdminVerificationsPage from '../pages/admin/AdminVerificationsPage'
import AdminCarouselPage from '../pages/admin/AdminCarouselPage'
import AdminRefundsPage from '../pages/admin/AdminRefundsPage'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'

export default function AppRouter() {
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: '/',
          element: <AppLayout />,
          children: [
            {
              index: true,
              element: <HomePage />,
            },
            {
              path: 'events',
              element: <HomePage />,
            },
            {
              path: 'login',
              element: <LoginPage />,
            },
            {
              path: 'register',
              element: <RegisterPage />,
            },
            {
              path: 'forgot-password',
              element: <ForgotPasswordPage />,
            },
            {
              path: 'reset-password',
              element: <ResetPasswordPage />,
            },
            {
              path: 'events/:id',
              element: <EventDetailPage />,
            },
            {
              path: 'event/:id',
              element: <EventSharePage />,
            },
            {
              path: 'users/:id',
              element: <UserProfilePage />,
            },
            {
              path: 'search/users',
              element: <SearchUsersPage />,
            },
            {
              path: 'search/events',
              element: <SearchEventsPage />,
            },
            {
              element: <RequireAuth />,
              children: [
                {
                  path: 'me',
                  element: <MePage />,
                },
                {
                  path: 'me/events',
                  element: <MyEventsPage />,
                },
                {
                  path: 'me/tickets',
                  element: <MyTicketsPage />,
                },
                {
                  path: 'me/favorites',
                  element: <MyFavoritesPage />,
                },
                {
                  path: 'me/notifications',
                  element: <MeNotificationsPage />,
                },
                {
                  path: 'me/challenges',
                  element: <MyChallengesPage />,
                },
                {
                  path: 'events/new',
                  element: <CreateEventPage />,
                },
                {
                  element: <RequireRole roles={['moderator', 'admin']} />,
                  children: [
                    {
                      path: 'moderator/reports',
                      element: <ModeratorReportsPage />,
                    },
                    {
                      path: 'moderator/activity',
                      element: <ModeratorActivityPage />,
                    },
                    {
                      path: 'moderator/users/reported',
                      element: <ModeratorUsersReportedPage />,
                    },
                    {
                      path: 'moderator/users/:id/warn',
                      element: <ModeratorWarnUserPage />,
                    },
                    {
                      path: 'moderator/challenges',
                      element: <ModeratorChallengesPage />,
                    },
                  ],
                },
                {
                  element: <RequireRole roles={['admin']} />,
                  children: [
                    {
                      path: 'admin/dashboard',
                      element: <AdminDashboardPage />,
                    },
                    {
                      path: 'admin/stats',
                      element: <AdminStatsPage />,
                    },
                    {
                      path: 'admin/events',
                      element: <AdminEventsPage />,
                    },
                    {
                      path: 'admin/payments',
                      element: <AdminPaymentsPage />,
                    },
                    {
                      path: 'admin/tickets',
                      element: <AdminTicketsPage />,
                    },
                    {
                      path: 'admin/reports',
                      element: <AdminReportsPage />,
                    },
                    {
                      path: 'admin/logs',
                      element: <AdminLogsPage />,
                    },
                    {
                      path: 'admin/challenges',
                      element: <AdminChallengesPage />,
                    },
                    {
                      path: 'admin/users',
                      element: <AdminUsersPage />,
                    },
                    {
                      path: 'admin/settings',
                      element: <AdminSettingsPage />,
                    },
                    {
                      path: 'admin/moderation',
                      element: <AdminModerationPage />,
                    },
                    {
                      path: 'admin/verifications',
                      element: <AdminVerificationsPage />,
                    },
                    {
                      path: 'admin/carousel',
                      element: <AdminCarouselPage />,
                    },
                    {
                      path: 'admin/refunds',
                      element: <AdminRefundsPage />,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
    []
  )

  return <RouterProvider router={router} />
}

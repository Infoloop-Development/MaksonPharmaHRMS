export const FIRST_LOGIN_SESSION_KEY = 'mams-first-login-session';

/** @deprecated use FIRST_LOGIN_SESSION_KEY */
export const PENDING_DASHBOARD_TOUR_KEY = 'mams-pending-dashboard-tour';

export function setFirstLoginSession() {
  sessionStorage.setItem(FIRST_LOGIN_SESSION_KEY, '1');
}

export function hasFirstLoginSession() {
  return sessionStorage.getItem(FIRST_LOGIN_SESSION_KEY) === '1';
}

export function clearFirstLoginSession() {
  sessionStorage.removeItem(FIRST_LOGIN_SESSION_KEY);
  sessionStorage.removeItem(PENDING_DASHBOARD_TOUR_KEY);
}

/** @deprecated use setFirstLoginSession */
export function setPendingDashboardTour() {
  setFirstLoginSession();
}

/** @deprecated use hasFirstLoginSession */
export function hasPendingDashboardTour() {
  return hasFirstLoginSession();
}

/** @deprecated use clearFirstLoginSession */
export function clearPendingDashboardTour() {
  clearFirstLoginSession();
}

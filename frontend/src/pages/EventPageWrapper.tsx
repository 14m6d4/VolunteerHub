import { EventsList } from './EventsList';
import { ManagerEventDashboard } from './manager/ManagerEventDashboard';

// TODO: Replace with actual user context/auth
// For now, change this value to test different views
const CURRENT_USER_ROLE: 'VOLUNTEER' | 'MANAGER' = 'MANAGER';

export const EventPageWrapper = () => {
  if (CURRENT_USER_ROLE === 'MANAGER') {
    return <ManagerEventDashboard />;
  }
  
  return <EventsList />;
};

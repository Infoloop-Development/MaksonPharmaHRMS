import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { mobileBottomNavTabs } from '../lib/mobileBottomNav';
import { NavIcon } from './navIcons';

export function MobileBottomNav() {
  const user = useAuth((s) => s.user);
  const tabs = mobileBottomNavTabs(user?.role);

  if (!tabs?.length) return null;

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Primary navigation">
      <div className="mobile-bottom-nav-inner">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            title={tab.label}
            className={({ isActive }) =>
              `mobile-bottom-nav-link touch-target ${tab.center ? 'mobile-bottom-nav-link--center' : ''} ${
                isActive ? 'mobile-bottom-nav-link--active' : ''
              }`
            }
          >
            <NavIcon name={tab.icon} />
            <span className="mobile-bottom-nav-label">{tab.shortLabel ?? tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

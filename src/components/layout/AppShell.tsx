import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Wrench, BarChart2, LogOut, Wind, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, type ReactNode } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Orders',    path: '/admin/orders',      icon: <ClipboardList size={15} />, roles: ['admin'] },
  { label: 'My Jobs',   path: '/technician/jobs',   icon: <Wrench size={15} />,        roles: ['technician'] },
  { label: 'Dashboard', path: '/manager/dashboard', icon: <BarChart2 size={15} />,     roles: ['manager'] },
  { label: 'Review',    path: '/manager/review',    icon: <ClipboardList size={15} />, roles: ['manager'] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleNav = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between px-6 h-14">

          {/* Left — Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Wind size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900">Sejuk Sejuk</p>
              <p className="text-xs text-gray-400">Operations</p>
            </div>
          </div>

          {/* Centre — Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNav.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right — User + Logout */}
          <div className="flex items-center gap-3 flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-700">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-none">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role}</p>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-12 right-4 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 min-w-[160px] z-50">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav — scrollable pill row below the bar */}
        <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {visibleNav.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 bg-gray-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

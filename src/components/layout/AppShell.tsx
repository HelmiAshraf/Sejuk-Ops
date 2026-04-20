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
  { label: 'Orders',    path: '/admin/orders',      icon: <ClipboardList size={20} />, roles: ['admin'] },
  { label: 'My Jobs',  path: '/technician/jobs',   icon: <Wrench size={20} />,        roles: ['technician'] },
  { label: 'Dashboard',path: '/manager/dashboard', icon: <BarChart2 size={20} />,     roles: ['manager'] },
  { label: 'Review',   path: '/manager/review',    icon: <ClipboardList size={20} />, roles: ['manager'] },
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

  // Technicians get a bottom tab bar on mobile for a native app feel
  const useBottomNav = user?.role === 'technician' || visibleNav.length <= 2;

  return (
    <div className="flex flex-col bg-gray-50" style={{ minHeight: '100dvh' }}>

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 flex-shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Wind size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900 tracking-tight">Sejuk Sejuk</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Operations</p>
            </div>
          </div>

          {/* Desktop nav links (hidden on mobile when using bottom nav) */}
          <nav className={`items-center gap-1 ${useBottomNav ? 'hidden md:flex' : 'hidden md:flex'}`}>
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

          {/* User menu */}
          <div className="flex items-center gap-2 flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-none">{user?.name}</p>
                <p className="text-[10px] text-gray-400 capitalize font-medium mt-0.5">{user?.role}</p>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-[3.75rem] right-3 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[180px] z-50">
                <div className="px-4 py-2.5 border-b border-gray-50 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors font-medium"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop-only: show horizontal pill nav inside header for non-bottom-nav roles */}
        {!useBottomNav && (
          <div className="md:hidden flex gap-1 px-4 pb-2.5 overflow-x-auto no-scrollbar">
            {visibleNav.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${useBottomNav ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : ''}`}>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* ── Bottom Tab Bar (mobile only, for technician / small nav) ─────────── */}
      {useBottomNav && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex">
            {visibleNav.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                    active ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <span className={`transition-transform ${active ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-t-full" />
                  )}
                </Link>
              );
            })}
            {/* Sign out tab */}
            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-gray-400 active:text-red-500 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-[10px] font-semibold tracking-wide">Sign out</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

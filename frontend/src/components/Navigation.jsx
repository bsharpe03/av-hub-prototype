import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Car, ChevronDown } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/policies', label: 'Policy Tracker' },
  { path: '/deployments', label: 'Deployments' },
  { path: '/funding', label: 'Funding' },
  { path: '/safety', label: 'Safety' },
  { path: '/resources', label: 'Resources' },
  { path: '/news', label: 'News' },
]

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="text-white shadow-lg sticky top-0 z-50" style={{ backgroundColor: '#004F98' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Car size={24} />
            <span>AV Hub</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/admin"
              className={`ml-2 px-3 py-2 rounded-md text-sm font-medium border border-white/30 transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Admin
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === item.path
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-white/80 hover:bg-white/10 border-t border-white/20 mt-2 pt-3"
            >
              Admin
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

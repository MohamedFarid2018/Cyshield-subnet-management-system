import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Network, Upload, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const initials = user ? getInitials(user.email) : '';

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/subnets" className="flex items-center gap-2 font-semibold text-blue-600">
          <Network size={20} />
          Subnet Manager
        </Link>
        <Link to="/subnets" className="text-sm text-gray-600 hover:text-blue-600">
          Subnets
        </Link>
        <Link to="/upload" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
          <Upload size={14} />
          Upload
        </Link>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="User menu"
        >
          {initials || <User size={16} />}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
              <p className="text-sm font-medium text-gray-800 truncate">{user?.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full capitalize">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Network, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/subnets" className="flex items-center gap-2 font-semibold text-blue-600">
          <Network size={20} />
          SubnetManager
        </Link>
        <Link to="/subnets" className="text-sm text-gray-600 hover:text-blue-600">
          Subnets
        </Link>
        <Link to="/upload" className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1">
          <Upload size={14} />
          Upload
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </nav>
  );
}

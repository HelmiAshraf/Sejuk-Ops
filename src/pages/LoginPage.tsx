import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MOCK_USERS } from '../constants';
import { Wind } from 'lucide-react';
import { Button } from '../components/ui/Button';
import type { MockUser } from '../types';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<MockUser>(MOCK_USERS[0]);

  const handleLogin = () => {
    login(selected);
    if (selected.role === 'admin') navigate('/admin/orders');
    else if (selected.role === 'technician') navigate('/technician/jobs');
    else navigate('/manager/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4">
            <Wind size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sejuk Sejuk Service</h1>
          <p className="text-sm text-gray-500 mt-1">Operations System</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sign in as
            </label>
            <select
              value={MOCK_USERS.indexOf(selected)}
              onChange={(e) => setSelected(MOCK_USERS[Number(e.target.value)])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MOCK_USERS.map((u, i) => (
                <option key={i} value={i}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
            <span className="font-medium capitalize text-gray-700 block mb-0.5">{selected.role}</span>
            {selected.role === 'admin' && 'Create & assign service orders'}
            {selected.role === 'technician' && 'View and complete field jobs'}
            {selected.role === 'manager' && 'Review jobs & query AI assistant'}
          </div>

          <Button className="w-full" size="lg" onClick={handleLogin}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

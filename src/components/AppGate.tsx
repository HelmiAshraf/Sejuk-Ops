import { useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';

const PASSWORD = import.meta.env.VITE_APP_PASSWORD as string | undefined;
const SESSION_KEY = 'app_unlocked';

export function AppGate({ children }: { children: ReactNode }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(
    !PASSWORD || sessionStorage.getItem(SESSION_KEY) === 'true'
  );

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 rounded-full p-3 mb-3">
            <Lock size={24} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sejuk Sejuk Service</h1>
          <p className="text-sm text-gray-500 mt-1">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              error ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-300'
            }`}
          />
          {error && <p className="text-xs text-red-500 text-center">Incorrect password. Try again.</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

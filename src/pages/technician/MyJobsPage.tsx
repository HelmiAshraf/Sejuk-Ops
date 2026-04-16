import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card } from '../../components/ui/Card';
import type { Order } from '../../types';
import { MapPin, ChevronRight } from 'lucide-react';

const ACTIVE_STATUSES = ['Assigned', 'In Progress'];
const DONE_STATUSES = ['Job Done', 'Reviewed', 'Closed'];

export default function MyJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'done'>('active');

  useEffect(() => {
    if (!user?.technicianId) return;
    getOrders({ technician_id: user.technicianId })
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const done = orders.filter((o) => DONE_STATUSES.includes(o.status));
  const list = tab === 'active' ? active : done;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-sm text-gray-500">{user?.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(['active', 'done'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            {t === 'active' ? `Active (${active.length})` : `Completed (${done.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">No {tab} jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((order) => (
            <Card key={order.id}>
              <button
                className="w-full text-left px-4 py-4"
                onClick={() => navigate(`/technician/jobs/${order.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-blue-600 font-medium">{order.order_no}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{order.customer_name}</p>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">{order.service_type}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400 min-w-0">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">{order.customer_address}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 mt-1 flex-shrink-0" />
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

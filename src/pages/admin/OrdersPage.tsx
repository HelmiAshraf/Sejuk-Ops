import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrders } from '../../api/orders';
import { getTechnicians } from '../../api/technicians';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card } from '../../components/ui/Card';
import type { Order, OrderStatus, Technician } from '../../types';
import { ORDER_STATUSES } from '../../constants';
import { Plus, Search } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [techFilter, setTechFilter] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getOrders(statusFilter ? { status: statusFilter } : {}),
      getTechnicians(),
    ]).then(([o, t]) => {
      setOrders(o);
      setTechnicians(t);
    }).finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = orders.filter((o) => {
    if (techFilter && o.assigned_technician_id !== techFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.order_no.toLowerCase().includes(q) && !o.customer_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} total orders</p>
        </div>
        <Button onClick={() => navigate('/admin/orders/new')}>
          <Plus size={16} />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="px-4 py-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search order no. or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Technicians</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {['Order No', 'Customer', 'Service', 'Technician', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{order.order_no}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{order.service_type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.technician?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

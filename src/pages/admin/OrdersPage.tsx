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
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortKey = 'order_no' | 'customer_name' | 'service_type' | 'technician' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';
type Tab = 'new' | 'all';

const columns: { label: string; key: SortKey | null }[] = [
  { label: 'Order No', key: 'order_no' },
  { label: 'Customer', key: 'customer_name' },
  { label: 'Service', key: 'service_type' },
  { label: 'Technician', key: 'technician' },
  { label: 'Status', key: 'status' },
  { label: 'Date', key: 'created_at' },
  { label: '', key: null },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('new');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [techFilter, setTechFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getOrders({}),
      getTechnicians(),
    ]).then(([o, t]) => {
      setOrders(o);
      setTechnicians(t);
    }).finally(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSearch('');
    setStatusFilter('');
    setTechFilter('');
  };

  const tabOrders = tab === 'new'
    ? orders.filter((o) => o.status === 'New')
    : orders.filter((o) => o.status !== 'New');

  const filtered = tabOrders.filter((o) => {
    if (tab === 'all') {
      if (statusFilter && o.status !== statusFilter) return false;
      if (techFilter && o.assigned_technician_id !== techFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!o.order_no.toLowerCase().includes(q) && !o.customer_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: string;
    let bVal: string;
    if (sortKey === 'technician') {
      aVal = a.technician?.name ?? '';
      bVal = b.technician?.name ?? '';
    } else if (sortKey === 'created_at') {
      aVal = a.created_at;
      bVal = b.created_at;
    } else {
      aVal = (a[sortKey] as string) ?? '';
      bVal = (b[sortKey] as string) ?? '';
    }
    const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const newCount = orders.filter((o) => o.status === 'New').length;

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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('new')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'new'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          New
          {newCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {newCount}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('all')}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Orders
        </button>
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
          {tab === 'all' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {ORDER_STATUSES.filter((s) => s !== 'New').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={techFilter}
                onChange={(e) => setTechFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Technicians</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {columns.map((col) => (
                    <th
                      key={col.label}
                      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide${col.key ? ' cursor-pointer select-none hover:text-gray-700' : ''}`}
                      onClick={col.key ? () => handleSort(col.key!) : undefined}
                    >
                      {col.key ? (
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          ) : (
                            <ChevronsUpDown size={13} className="text-gray-300" />
                          )}
                        </span>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((order) => (
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
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(order.created_at)}</td>
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

import { useEffect, useState } from 'react';
import { getOrders, updateOrderStatus, updateCustomerDetails } from '../../api/orders';
import { getCompletionByOrderId } from '../../api/completions';
import { getPhotosByOrderId } from '../../api/storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { Order, JobCompletion, JobPhoto, ManagerReview } from '../../types';
import { CheckCircle, Flag, ImageOff, Clock, History, Pencil, Check, X, ChevronDown, Receipt } from 'lucide-react';

type Tab = 'pending' | 'history';

export default function ReviewPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('pending');

  // Pending tab state
  const [pending, setPending] = useState<Order[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  // History tab state
  const [history, setHistory] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Detail panel state (shared)
  const [selected, setSelected] = useState<Order | null>(null);
  const [completion, setCompletion] = useState<JobCompletion | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [review, setReview] = useState<ManagerReview | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pending review action state
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Customer edit state
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ customer_name: '', customer_phone: '', customer_address: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const isMobile = () => window.innerWidth < 768;

  const loadPending = (autoSelect = false) => {
    setPendingLoading(true);
    getOrders({ status: 'Job Done' })
      .then((orders) => {
        setPending(orders);
        if (autoSelect && orders.length > 0 && !isMobile()) handleSelect(orders[0]);
      })
      .finally(() => setPendingLoading(false));
  };

  const loadHistory = () => {
    setHistoryLoading(true);
    Promise.all([
      getOrders({ status: 'Reviewed' }),
      getOrders({ status: 'Closed' }),
    ])
      .then(([reviewed, closed]) => {
        const sorted = [...reviewed, ...closed].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        setHistory(sorted);
        if (sorted.length > 0 && !isMobile()) handleSelect(sorted[0]);
      })
      .finally(() => {
        setHistoryLoading(false);
        setHistoryLoaded(true);
      });
  };

  useEffect(() => loadPending(true), []);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSelected(null);
    if (t === 'history' && !historyLoaded) loadHistory();
  };

  const handleSelect = async (order: Order) => {
    setSelected(order);
    setReviewNotes('');
    setCompletion(null);
    setPhotos([]);
    setReview(null);
    setEditingCustomer(false);
    setDetailLoading(true);
    try {
      const [c, p] = await Promise.all([
        getCompletionByOrderId(order.id),
        getPhotosByOrderId(order.id),
      ]);
      setCompletion(c);
      setPhotos(p);

      // Fetch manager review record for history tab
      if (tab === 'history' || order.status === 'Reviewed' || order.status === 'Closed') {
        const { data } = await supabase
          .from('manager_reviews')
          .select('*')
          .eq('order_id', order.id)
          .maybeSingle();
        setReview(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const startEditCustomer = () => {
    if (!selected) return;
    setCustomerForm({
      customer_name: selected.customer_name,
      customer_phone: selected.customer_phone ?? '',
      customer_address: selected.customer_address,
    });
    setEditingCustomer(true);
  };

  const handleSaveCustomer = async () => {
    if (!selected) return;
    setSavingCustomer(true);
    try {
      await updateCustomerDetails(selected.id, customerForm, user?.name ?? 'manager', 'manager');
      setSelected({ ...selected, ...customerForm });
      setEditingCustomer(false);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleReview = async (outcome: 'Approved' | 'Flagged') => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await supabase.from('manager_reviews').upsert({
        order_id: selected.id,
        reviewed_by: user?.name ?? 'manager',
        review_notes: reviewNotes,
        outcome,
      }, { onConflict: 'order_id' });
      await updateOrderStatus(selected.id, 'Job Done', 'Closed', 'manager', user?.name ?? '', { outcome });
      setSelected(null);
      loadPending();
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'pending', label: 'Pending', icon: <Clock size={15} />, count: pending.length },
    { id: 'history', label: 'History', icon: <History size={15} /> },
  ];

  const activeOrders = tab === 'pending' ? pending : history;
  const isLoading = tab === 'pending' ? pendingLoading : historyLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job Review</h1>
        <p className="text-sm text-gray-500 mt-1">Review completed jobs and track history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold font-mono ${
                tab === t.id ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16"><LoadingSpinner /></div>
      ) : activeOrders.length === 0 ? (
        <div className="py-16 text-center">
          {tab === 'pending' ? (
            <>
              <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">All caught up</p>
              <p className="text-sm text-gray-400 mt-1">No jobs pending review</p>
            </>
          ) : (
            <>
              <History size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No history yet</p>
              <p className="text-sm text-gray-400 mt-1">Reviewed jobs will appear here</p>
            </>
          )}
        </div>
      ) : (
        <>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          {/* Order list */}
          <div className="space-y-2">
            {activeOrders.map((order) => (
              <Card
                key={order.id}
                className={`cursor-pointer transition-all ${
                  selected?.id === order.id
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : 'hover:shadow-md'
                }`}
              >
                <button className="w-full text-left" onClick={() => handleSelect(order)}>
                  <CardBody className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-blue-600 font-medium">{order.order_no}</span>
                        <p className="font-semibold text-gray-900 mt-0.5 truncate">{order.customer_name}</p>
                        <p className="text-sm text-gray-500 truncate">{order.service_type}</p>
                        <p className="text-xs text-gray-400 mt-1">Tech: {order.technician?.name ?? '—'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <StatusBadge status={order.status} />
                        <span className="text-xs font-mono text-gray-400">
                          {new Date(order.updated_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </button>
              </Card>
            ))}
          </div>

          {/* Detail panel — desktop only */}
          {selected ? (
            <div className="hidden md:block md:sticky md:top-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selected.order_no}</p>
                      <p className="text-sm text-gray-500">{selected.customer_name}</p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                </CardHeader>

                <CardBody className="space-y-4">
                  {detailLoading ? (
                    <div className="py-8"><LoadingSpinner /></div>
                  ) : completion ? (
                    <>
                      {/* Customer details */}
                      <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Customer</p>
                          {!editingCustomer ? (
                            <button onClick={startEditCustomer} className="text-gray-400 hover:text-blue-600 transition-colors">
                              <Pencil size={13} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={handleSaveCustomer} disabled={savingCustomer} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                                <Check size={15} />
                              </button>
                              <button onClick={() => setEditingCustomer(false)} disabled={savingCustomer} className="text-gray-400 hover:text-red-500">
                                <X size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCustomer ? (
                          <>
                            <div>
                              <label className="text-xs text-gray-500 mb-0.5 block">Name</label>
                              <input
                                value={customerForm.customer_name}
                                onChange={e => setCustomerForm(f => ({ ...f, customer_name: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-0.5 block">Phone</label>
                              <input
                                value={customerForm.customer_phone}
                                onChange={e => setCustomerForm(f => ({ ...f, customer_phone: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-0.5 block">Address</label>
                              <textarea
                                rows={2}
                                value={customerForm.customer_address}
                                onChange={e => setCustomerForm(f => ({ ...f, customer_address: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p><span className="text-gray-500">Name:</span> <span className="font-medium">{selected.customer_name}</span></p>
                            <p><span className="text-gray-500">Phone:</span> <span className="font-mono">{selected.customer_phone || '—'}</span></p>
                            <p><span className="text-gray-500">Address:</span> {selected.customer_address}</p>
                          </>
                        )}
                      </div>

                      {/* Completion details */}
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Work Done</span>
                          <p className="text-gray-800 mt-0.5">{completion.work_done}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-400">Quoted</span>
                            <p className="font-semibold font-mono text-gray-800">RM {selected.quoted_price.toFixed(2)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-400">Extra Charges</span>
                            <p className="font-semibold font-mono text-gray-800">RM {completion.extra_charges.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between bg-green-50 rounded-lg px-3 py-2">
                          <span className="font-medium text-gray-700">Final Amount</span>
                          <span className="font-bold font-mono text-green-700">RM {completion.final_amount.toFixed(2)}</span>
                        </div>
                        {completion.payment_amount != null && (
                          <div className="flex justify-between text-xs text-gray-500 px-1">
                            <span>Payment received</span>
                            <span className="font-mono">RM {completion.payment_amount.toFixed(2)} · {completion.payment_method}</span>
                          </div>
                        )}
                        {completion.remarks && (
                          <div>
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Remarks</span>
                            <p className="text-gray-700 mt-0.5">{completion.remarks}</p>
                          </div>
                        )}
                        {completion.payment_remarks && (
                          <div>
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Payment Remarks</span>
                            <p className="text-gray-700 mt-0.5">{completion.payment_remarks}</p>
                          </div>
                        )}
                      </div>

                      {/* Payment Receipt */}
                      {completion.receipt_photo_url && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Receipt size={13} /> Payment Receipt
                          </p>
                          <a href={completion.receipt_photo_url} target="_blank" rel="noopener noreferrer" className="block">
                            {completion.receipt_photo_url.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? (
                              <img
                                src={completion.receipt_photo_url}
                                alt="Payment receipt"
                                className="w-full max-h-48 object-contain rounded-lg border hover:opacity-80 transition bg-gray-50"
                              />
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border hover:bg-gray-100 transition text-sm text-blue-600">
                                <Receipt size={16} />
                                <span>View receipt document</span>
                              </div>
                            )}
                          </a>
                        </div>
                      )}

                      {/* Photos */}
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Job Photos</p>
                        {photos.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                            <ImageOff size={14} />
                            <span>No photos uploaded</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((p) => (
                              <a key={p.id} href={p.public_url} target="_blank" rel="noopener noreferrer" className="block">
                                {p.file_type?.startsWith('image/') ? (
                                  <img
                                    src={p.public_url}
                                    alt=""
                                    className="w-full h-20 object-cover rounded-lg border hover:opacity-80 transition"
                                  />
                                ) : (
                                  <div className="w-full h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-xs text-gray-500 hover:bg-gray-200 transition">
                                    {p.file_type?.split('/')[1]?.toUpperCase() ?? 'FILE'}
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pending: action form */}
                      {tab === 'pending' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                              Review Notes
                            </label>
                            <textarea
                              rows={3}
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Optional notes..."
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button className="flex-1" loading={submitting} onClick={() => handleReview('Approved')}>
                              <CheckCircle size={15} /> Approve
                            </Button>
                            <Button variant="danger" className="flex-1" loading={submitting} onClick={() => handleReview('Flagged')}>
                              <Flag size={15} /> Flag
                            </Button>
                          </div>
                        </>
                      )}

                      {/* History: show review record */}
                      {tab === 'history' && review && (
                        <div className={`rounded-lg px-4 py-3 border ${
                          review.outcome === 'Approved'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {review.outcome === 'Approved' ? (
                              <CheckCircle size={15} className="text-green-600" />
                            ) : (
                              <Flag size={15} className="text-red-500" />
                            )}
                            <span className={`text-sm font-semibold ${
                              review.outcome === 'Approved' ? 'text-green-700' : 'text-red-600'
                            }`}>
                              {review.outcome}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">by {review.reviewed_by}</span>
                          </div>
                          {review.review_notes && (
                            <p className="text-sm text-gray-600 mt-1">{review.review_notes}</p>
                          )}
                          <p className="text-xs font-mono text-gray-400 mt-1">
                            {new Date(review.reviewed_at).toLocaleString('en-MY', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No completion data found</p>
                  )}
                </CardBody>
              </Card>
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-center py-16 text-gray-300 w-full">
              <div className="text-center">
                <ClipboardIcon />
                <p className="text-sm mt-2">Select a job to view details</p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile bottom sheet */}
        {selected && (
          <div className="md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSelected(null)}
            />
            {/* Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-white rounded-t-2xl shadow-2xl">
              {/* Handle + header */}
              <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{selected.order_no}</p>
                    <p className="text-xs text-gray-500">{selected.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.status} />
                    <button
                      onClick={() => setSelected(null)}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {detailLoading ? (
                  <div className="py-8"><LoadingSpinner /></div>
                ) : completion ? (
                  <>
                    {/* Customer details */}
                    <div className="space-y-2 text-sm border-b border-gray-100 pb-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Customer</p>
                        {!editingCustomer ? (
                          <button onClick={startEditCustomer} className="text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil size={13} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={handleSaveCustomer} disabled={savingCustomer} className="text-green-600 hover:text-green-700 disabled:opacity-50">
                              <Check size={15} />
                            </button>
                            <button onClick={() => setEditingCustomer(false)} disabled={savingCustomer} className="text-gray-400 hover:text-red-500">
                              <X size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                      {editingCustomer ? (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Name</label>
                            <input
                              value={customerForm.customer_name}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_name: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Phone</label>
                            <input
                              value={customerForm.customer_phone}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_phone: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">Address</label>
                            <textarea
                              rows={2}
                              value={customerForm.customer_address}
                              onChange={e => setCustomerForm(f => ({ ...f, customer_address: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <p><span className="text-gray-500">Name:</span> <span className="font-medium">{selected.customer_name}</span></p>
                          <p><span className="text-gray-500">Phone:</span> {selected.customer_phone || '—'}</p>
                          <p><span className="text-gray-500">Address:</span> {selected.customer_address}</p>
                        </>
                      )}
                    </div>

                    {/* Completion details */}
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Work Done</span>
                        <p className="text-gray-800 mt-0.5">{completion.work_done}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-400">Quoted</span>
                          <p className="font-semibold text-gray-800">RM {selected.quoted_price.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-400">Extra Charges</span>
                          <p className="font-semibold text-gray-800">RM {completion.extra_charges.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between bg-green-50 rounded-lg px-3 py-2">
                        <span className="font-medium text-gray-700">Final Amount</span>
                        <span className="font-bold text-green-700">RM {completion.final_amount.toFixed(2)}</span>
                      </div>
                      {completion.payment_amount != null && (
                        <div className="flex justify-between text-xs text-gray-500 px-1">
                          <span>Payment received</span>
                          <span>RM {completion.payment_amount.toFixed(2)} · {completion.payment_method}</span>
                        </div>
                      )}
                      {completion.remarks && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Remarks</span>
                          <p className="text-gray-700 mt-0.5">{completion.remarks}</p>
                        </div>
                      )}
                      {completion.payment_remarks && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Payment Remarks</span>
                          <p className="text-gray-700 mt-0.5">{completion.payment_remarks}</p>
                        </div>
                      )}
                    </div>

                    {/* Payment Receipt */}
                    {completion.receipt_photo_url && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Receipt size={13} /> Payment Receipt
                        </p>
                        <a href={completion.receipt_photo_url} target="_blank" rel="noopener noreferrer" className="block">
                          {completion.receipt_photo_url.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? (
                            <img
                              src={completion.receipt_photo_url}
                              alt="Payment receipt"
                              className="w-full max-h-48 object-contain rounded-lg border hover:opacity-80 transition bg-gray-50"
                            />
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border hover:bg-gray-100 transition text-sm text-blue-600">
                              <Receipt size={16} />
                              <span>View receipt document</span>
                            </div>
                          )}
                        </a>
                      </div>
                    )}

                    {/* Photos */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Job Photos</p>
                      {photos.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                          <ImageOff size={14} />
                          <span>No photos uploaded</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {photos.map((p) => (
                            <a key={p.id} href={p.public_url} target="_blank" rel="noopener noreferrer" className="block">
                              {p.file_type?.startsWith('image/') ? (
                                <img
                                  src={p.public_url}
                                  alt=""
                                  className="w-full h-20 object-cover rounded-lg border hover:opacity-80 transition"
                                />
                              ) : (
                                <div className="w-full h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-xs text-gray-500 hover:bg-gray-200 transition">
                                  {p.file_type?.split('/')[1]?.toUpperCase() ?? 'FILE'}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pending: action form */}
                    {tab === 'pending' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                            Review Notes
                          </label>
                          <textarea
                            rows={3}
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Optional notes..."
                          />
                        </div>
                        <div className="flex gap-3 pb-2">
                          <Button className="flex-1" loading={submitting} onClick={() => handleReview('Approved')}>
                            <CheckCircle size={15} /> Approve
                          </Button>
                          <Button variant="danger" className="flex-1" loading={submitting} onClick={() => handleReview('Flagged')}>
                            <Flag size={15} /> Flag
                          </Button>
                        </div>
                      </>
                    )}

                    {/* History: show review record */}
                    {tab === 'history' && review && (
                      <div className={`rounded-lg px-4 py-3 border mb-2 ${
                        review.outcome === 'Approved'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {review.outcome === 'Approved' ? (
                            <CheckCircle size={15} className="text-green-600" />
                          ) : (
                            <Flag size={15} className="text-red-500" />
                          )}
                          <span className={`text-sm font-semibold ${
                            review.outcome === 'Approved' ? 'text-green-700' : 'text-red-600'
                          }`}>
                            {review.outcome}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">by {review.reviewed_by}</span>
                        </div>
                        {review.review_notes && (
                          <p className="text-sm text-gray-600 mt-1">{review.review_notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(review.reviewed_at).toLocaleString('en-MY', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No completion data found</p>
                )}
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

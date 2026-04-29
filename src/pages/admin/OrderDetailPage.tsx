import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, assignTechnician, updateOrderStatus, updateCustomerDetails, updateServiceDetails } from '../../api/orders';
import { getAuditLog } from '../../api/audit';
import { getCompletionByOrderId } from '../../api/completions';
import { getPhotosByOrderId } from '../../api/storage';
import { getTechniciansWithWorkload } from '../../api/technicians';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { TechnicianMapModal } from '../../components/TechnicianMapModal';
import type { Order, AuditLog, JobCompletion, JobPhoto, TechnicianWithWorkload } from '../../types';
import { SERVICE_TYPES } from '../../constants';
import { ArrowLeft, User, Clock, FileText, Camera, Pencil, Check, X, Receipt } from 'lucide-react';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [completion, setCompletion] = useState<JobCompletion | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianWithWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ customer_name: '', customer_phone: '', customer_address: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [editingService, setEditingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ service_type: '', quoted_price: '', problem_description: '', admin_notes: '' });
  const [savingService, setSavingService] = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([
      getOrderById(id),
      getAuditLog(id),
      getCompletionByOrderId(id),
      getPhotosByOrderId(id),
      getTechniciansWithWorkload(),
    ]).then(([o, a, c, p, t]) => {
      setOrder(o);
      setAudit(a);
      setCompletion(c);
      setPhotos(p);
      setTechnicians(t);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleAssign = async (techId: string) => {
    if (!order) return;
    setAssigning(true);
    try {
      await assignTechnician(order.id, techId, user?.name ?? 'admin', order.status);
      setShowMap(false);
      load();
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = async () => {
    if (!order) return;
    await updateOrderStatus(order.id, order.status, 'Closed', 'admin', user?.name ?? 'admin');
    load();
  };

  const startEditCustomer = () => {
    if (!order) return;
    setCustomerForm({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone ?? '',
      customer_address: order.customer_address,
    });
    setEditingCustomer(true);
  };

  const handleSaveCustomer = async () => {
    if (!order) return;
    setSavingCustomer(true);
    try {
      await updateCustomerDetails(order.id, customerForm, user?.name ?? 'admin', 'admin');
      setEditingCustomer(false);
      load();
    } finally {
      setSavingCustomer(false);
    }
  };

  const startEditService = () => {
    if (!order) return;
    setServiceForm({
      service_type: order.service_type,
      quoted_price: order.quoted_price.toString(),
      problem_description: order.problem_description ?? '',
      admin_notes: order.admin_notes ?? '',
    });
    setEditingService(true);
  };

  const handleSaveService = async () => {
    if (!order) return;
    setSavingService(true);
    try {
      await updateServiceDetails(
        order.id,
        {
          service_type: serviceForm.service_type,
          quoted_price: Number(serviceForm.quoted_price) || 0,
          problem_description: serviceForm.problem_description,
          admin_notes: serviceForm.admin_notes,
        },
        user?.name ?? 'admin'
      );
      setEditingService(false);
      load();
    } finally {
      setSavingService(false);
    }
  };

  if (loading) return <div className="py-20"><LoadingSpinner /></div>;
  if (!order) return <p className="text-center text-gray-500">Order not found</p>;

  const canAssign = (order.status === 'New' || order.status === 'Assigned') && user?.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/orders')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{order.order_no}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-500">Created <span className="font-mono">{new Date(order.created_at).toLocaleString()}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {canAssign && (
            <Button variant="secondary" size="sm" onClick={() => setShowMap(true)}>
              <User size={14} /> {order.assigned_technician_id ? 'Re-assign' : 'Assign Technician'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-800 flex items-center gap-2"><User size={16} /> Customer</p>
              {!editingCustomer ? (
                <button onClick={startEditCustomer} className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Pencil size={14} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveCustomer} disabled={savingCustomer} className="text-green-600 hover:text-green-700 transition-colors disabled:opacity-50">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingCustomer(false)} disabled={savingCustomer} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
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
                <p><span className="text-gray-500">Name:</span> <span className="font-medium">{order.customer_name}</span></p>
                <p><span className="text-gray-500">Phone:</span> <span className="font-mono">{order.customer_phone || '—'}</span></p>
                <p><span className="text-gray-500">Address:</span> {order.customer_address}</p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-800 flex items-center gap-2"><FileText size={16} /> Service</p>
              {!['Job Done', 'Reviewed', 'Closed'].includes(order.status) && (
                !editingService ? (
                  <button onClick={startEditService} className="text-gray-400 hover:text-blue-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleSaveService} disabled={savingService} className="text-green-600 hover:text-green-700 transition-colors disabled:opacity-50">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingService(false)} disabled={savingService} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )
              )}
            </div>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {editingService ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Service Type</label>
                  <select
                    value={serviceForm.service_type}
                    onChange={e => setServiceForm(f => ({ ...f, service_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Quoted Price (RM)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={serviceForm.quoted_price}
                    onChange={e => setServiceForm(f => ({ ...f, quoted_price: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Problem Description</label>
                  <textarea
                    rows={2}
                    value={serviceForm.problem_description}
                    onChange={e => setServiceForm(f => ({ ...f, problem_description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Admin Notes</label>
                  <textarea
                    rows={2}
                    value={serviceForm.admin_notes}
                    onChange={e => setServiceForm(f => ({ ...f, admin_notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <p><span className="text-gray-500">Type:</span> <span className="font-medium">{order.service_type}</span></p>
                <p><span className="text-gray-500">Quoted:</span> <span className="font-medium font-mono text-green-700">RM {order.quoted_price.toFixed(2)}</span></p>
                <p><span className="text-gray-500">Technician:</span> {order.technician?.name ?? <span className="text-gray-400">Not assigned</span>}</p>
                {order.problem_description && <p><span className="text-gray-500">Problem:</span> {order.problem_description}</p>}
                {order.admin_notes && <p><span className="text-gray-500">Notes:</span> {order.admin_notes}</p>}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Completion details */}
      {completion && (
        <Card>
          <CardHeader><p className="font-medium text-gray-800 flex items-center gap-2"><FileText size={16} /> Job Completion</p></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <p><span className="text-gray-500">Work Done:</span> {completion.work_done}</p>
            <p><span className="text-gray-500">Extra Charges:</span> <span className="font-mono">RM {completion.extra_charges.toFixed(2)}</span></p>
            <p><span className="text-gray-500">Final Amount:</span> <span className="font-bold font-mono text-green-700">RM {completion.final_amount.toFixed(2)}</span></p>
            {completion.payment_amount != null && (
              <p><span className="text-gray-500">Payment Received:</span> <span className="font-mono">RM {completion.payment_amount.toFixed(2)}</span> · {completion.payment_method}</p>
            )}
            {completion.remarks && <p><span className="text-gray-500">Remarks:</span> {completion.remarks}</p>}
            {completion.payment_remarks && <p><span className="text-gray-500">Payment Remarks:</span> {completion.payment_remarks}</p>}
            <p><span className="text-gray-500">Completed:</span> <span className="font-mono">{new Date(completion.completed_at).toLocaleString()}</span></p>
          </CardBody>
        </Card>
      )}

      {/* Payment Receipt */}
      {completion?.receipt_photo_url && (
        <Card>
          <CardHeader><p className="font-medium text-gray-800 flex items-center gap-2"><Receipt size={16} /> Payment Receipt</p></CardHeader>
          <CardBody>
            <a href={completion.receipt_photo_url} target="_blank" rel="noopener noreferrer" className="block">
              {completion.receipt_photo_url.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? (
                <img
                  src={completion.receipt_photo_url}
                  alt="Payment receipt"
                  className="w-full max-h-64 object-contain rounded-lg border hover:opacity-90 transition bg-gray-50"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border hover:bg-gray-100 transition text-sm text-blue-600">
                  <Receipt size={16} />
                  <span>View receipt document</span>
                </div>
              )}
            </a>
          </CardBody>
        </Card>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <Card>
          <CardHeader><p className="font-medium text-gray-800 flex items-center gap-2"><Camera size={16} /> Photos (<span className="font-mono">{photos.length}</span>)</p></CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((p) => (
                <a key={p.id} href={p.public_url} target="_blank" rel="noopener noreferrer">
                  {p.file_type?.startsWith('image/') ? (
                    <img src={p.public_url} alt="job" className="w-full h-28 object-cover rounded-lg border hover:opacity-90 transition" />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 rounded-lg border flex items-center justify-center text-xs text-gray-500 hover:bg-gray-200 transition">
                      {p.file_type?.split('/')[1]?.toUpperCase() ?? 'FILE'}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Audit Trail */}
      <Card>
        <CardHeader><p className="font-medium text-gray-800 flex items-center gap-2"><Clock size={16} /> Audit Trail</p></CardHeader>
        <CardBody>
          {audit.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-4">
              {audit.map((log) => (
                <li key={log.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-blue-400" />
                  <p className="text-sm font-medium text-gray-800">{log.action.replace(/_/g, ' ')}</p>
                  {log.from_status && (
                    <p className="text-xs text-gray-500">{log.from_status} → {log.to_status}</p>
                  )}
                  <p className="text-xs text-gray-400">{log.actor_name} · <span className="font-mono">{new Date(log.created_at).toLocaleString()}</span></p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* Technician Map Modal */}
      {showMap && (
        <TechnicianMapModal
          order={order}
          technicians={technicians}
          onAssign={handleAssign}
          onClose={() => setShowMap(false)}
          assigning={assigning}
        />
      )}
    </div>
  );
}

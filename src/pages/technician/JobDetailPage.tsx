import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, updateOrderStatus } from '../../api/orders';
import { createCompletion } from '../../api/completions';
import { uploadJobPhoto, getPhotosByOrderId, deleteJobPhoto } from '../../api/storage';
import { extractDocumentData, notifyCustomer } from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { JobPhoto, Order } from '../../types';
import { ArrowLeft, MapPin, Upload, X, CheckCircle, Sparkles, Phone, Wrench, FileText, DollarSign, ExternalLink, MessageCircle } from 'lucide-react';

const MAX_PHOTOS = 6;

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [otwSent, setOtwSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    work_done: '',
    extra_charges: '0',
    remarks: '',
    payment_amount: '',
    payment_method: '',
  });

  const load = () => {
    if (!id) return;
    Promise.all([getOrderById(id), getPhotosByOrderId(id)])
      .then(([o, p]) => { setOrder(o); setPhotos(p); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleStart = async () => {
    if (!order) return;
    setStarting(true);
    try {
      await updateOrderStatus(order.id, 'Assigned', 'In Progress', 'technician', user?.name ?? '');
      if (order.customer_phone) {
        notifyCustomer({
          customerPhone: order.customer_phone,
          customerName: order.customer_name,
          orderNo: order.order_no,
          serviceType: order.service_type,
          technicianName: user?.name ?? 'our technician',
          type: 'otw',
        });
        setOtwSent(true);
      }
      load();
    } finally {
      setStarting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !order) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      alert(`Maximum ${MAX_PHOTOS} files allowed`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const photo = await uploadJobPhoto(order.id, file, user?.name ?? '');
        setPhotos((prev) => [...prev, photo]);

        // AI Document Understanding — auto-extract if PDF
        if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
          setExtracting(true);
          try {
            const result = await extractDocumentData(photo.public_url, file.type);
            if (result.answer && result.answer !== 'N/A') {
              setForm((f) => ({ ...f, work_done: f.work_done ? f.work_done : result.answer }));
            }
          } catch {
            // extraction is best-effort
          } finally {
            setExtracting(false);
          }
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async (photo: JobPhoto) => {
    await deleteJobPhoto(photo.id, photo.storage_path);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const handleSubmit = async () => {
    if (!order || !form.work_done.trim()) {
      alert('Please describe the work done');
      return;
    }
    setSubmitting(true);
    try {
      const extra = Number(form.extra_charges) || 0;
      await createCompletion({
        order_id: order.id,
        technician_id: user?.technicianId ?? '',
        work_done: form.work_done,
        extra_charges: extra,
        final_amount: order.quoted_price + extra,
        remarks: form.remarks,
        payment_amount: form.payment_amount ? Number(form.payment_amount) : null,
        payment_method: (form.payment_method as any) || null,
      });
      await updateOrderStatus(order.id, 'In Progress', 'Job Done', 'technician', user?.name ?? '', {
        final_amount: order.quoted_price + extra,
      });

      // Auto-notify customer via WhatsApp (fire-and-forget)
      if (order.customer_phone) {
        notifyCustomer({
          customerPhone: order.customer_phone,
          customerName: order.customer_name,
          orderNo: order.order_no,
          serviceType: order.service_type,
          technicianName: user?.name ?? 'our technician',
        });
      }

      load();
    } finally {
      setSubmitting(false);
    }
  };

  const finalAmount = order ? order.quoted_price + (Number(form.extra_charges) || 0) : 0;

  if (loading) return <div className="py-20"><LoadingSpinner /></div>;
  if (!order) return <p className="text-center text-gray-500">Job not found</p>;

  const mapsUrl = order.latitude && order.longitude
    ? `https://maps.google.com/maps?q=${order.latitude},${order.longitude}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(order.customer_address)}`;

  return (
    <div className="max-w-lg mx-auto space-y-3 pb-20">

      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate('/technician/jobs')} className="p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-blue-600 font-semibold tracking-wide">{order.order_no}</span>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      {/* Customer card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-lg font-bold text-gray-900 leading-tight">{order.customer_name}</p>
        {order.customer_phone && (
          <a
            href={`tel:${order.customer_phone}`}
            className="inline-flex items-center gap-1.5 mt-1 text-sm text-blue-600 font-medium active:opacity-70"
          >
            <Phone size={13} />
            {order.customer_phone}
          </a>
        )}
      </div>

      {/* Service & Problem */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Wrench size={14} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Service</p>
            <p className="text-sm font-semibold text-gray-800">{order.service_type}</p>
          </div>
        </div>
        {order.problem_description && (
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText size={14} className="text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Problem</p>
              <p className="text-sm text-gray-700 leading-snug">{order.problem_description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quoted Price */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
          <DollarSign size={14} className="text-green-500" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Quoted Price</p>
          <p className="text-base font-bold text-gray-900">RM {order.quoted_price.toFixed(2)}</p>
        </div>
      </div>

      {/* Address / Map */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-white rounded-2xl border border-blue-200 shadow-sm px-4 py-3 active:bg-blue-50 transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <MapPin size={14} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Open Map</p>
          <p className="text-sm text-blue-600 font-medium leading-snug">{order.customer_address}</p>
        </div>
        <ExternalLink size={14} className="text-blue-400 flex-shrink-0" />
      </a>

      {/* Start job */}
      {order.status === 'Assigned' && (
        <Button className="w-full" size="lg" loading={starting} onClick={handleStart}>
          Start Job
        </Button>
      )}

      {/* OTW WhatsApp sent indicator */}
      {otwSent && order.customer_phone && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
          <MessageCircle size={15} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">WhatsApp sent — customer has been notified you're on the way.</p>
        </div>
      )}

      {/* Complete job form */}
      {order.status === 'In Progress' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">Job Completion</p>
                {extracting && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Sparkles size={12} /> AI extracting...
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Done *</label>
                <textarea
                  rows={3}
                  value={form.work_done}
                  onChange={(e) => setForm((f) => ({ ...f, work_done: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe work performed..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Charges (RM)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.extra_charges}
                  onChange={(e) => setForm((f) => ({ ...f, extra_charges: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Final Amount</span>
                <span className="text-lg font-bold text-green-700">RM {finalAmount.toFixed(2)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes..."
                />
              </div>
            </CardBody>
          </Card>

          {/* Payment (bonus) */}
          <Card>
            <CardHeader><p className="font-medium text-gray-800">Payment Received (Optional)</p></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="number" min="0" step="0.01"
                  placeholder="Amount (RM)"
                  value={form.payment_amount}
                  onChange={(e) => setForm((f) => ({ ...f, payment_amount: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Method...</option>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>E-Wallet</option>
                </select>
              </div>
            </CardBody>
          </Card>

          {/* Photo upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">Photos / Documents</p>
                <span className="text-xs text-gray-400">{photos.length}/{MAX_PHOTOS}</span>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative group">
                      {p.file_type?.startsWith('image/') ? (
                        <img src={p.public_url} alt="" className="w-full h-24 object-cover rounded-lg border" />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 rounded-lg border flex items-center justify-center text-xs text-gray-500">
                          {p.file_type?.split('/')[1]?.toUpperCase() ?? 'FILE'}
                        </div>
                      )}
                      <button
                        onClick={() => handleRemovePhoto(p)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < MAX_PHOTOS && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition flex items-center justify-center gap-2"
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : <Upload size={16} />}
                    {uploading ? 'Uploading...' : 'Tap to add photos / PDF'}
                  </button>
                </>
              )}
            </CardBody>
          </Card>

          <Button className="w-full" size="lg" loading={submitting} onClick={handleSubmit}>
            Mark Job Done
          </Button>
        </>
      )}

      {/* Job completed confirmation */}
      {order.status === 'Job Done' && (
        <Card className="border-green-200 bg-green-50">
          <CardBody className="text-center">
            <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800 mb-1">Job Completed!</p>
            <p className="text-sm text-gray-500">Feedback request has been sent to the customer via WhatsApp.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

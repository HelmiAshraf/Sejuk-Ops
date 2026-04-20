import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, updateOrderStatus } from '../../api/orders';
import { createCompletion, getCompletionByOrderId } from '../../api/completions';
import { uploadJobPhoto, getPhotosByOrderId, deleteJobPhoto, uploadReceiptPhoto } from '../../api/storage';
import { extractDocumentData, extractReceiptData, notifyCustomer } from '../../api/ai';
import { getAuditLog } from '../../api/audit';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { AuditLog, JobCompletion, JobPhoto, Order } from '../../types';
import { ArrowLeft, MapPin, Upload, X, CheckCircle, Sparkles, Phone, Wrench, FileText, DollarSign, MessageCircle, Clock, Navigation, CalendarDays, Receipt, Camera } from 'lucide-react';

const MAX_PHOTOS = 6;


function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [completion, setCompletion] = useState<JobCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [otwSent, setOtwSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [extractingReceipt, setExtractingReceipt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    work_done: '',
    extra_charges: '0',
    remarks: '',
    payment_amount: '',
    payment_method: '',
  });

  const load = () => {
    if (!id) return;
    Promise.all([
      getOrderById(id),
      getPhotosByOrderId(id),
      getAuditLog(id),
      getCompletionByOrderId(id),
    ])
      .then(([o, p, logs, comp]) => {
        setOrder(o);
        setPhotos(p);
        setAuditLogs(logs);
        setCompletion(comp);
      })
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

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    setUploadingReceipt(true);
    try {
      const url = await uploadReceiptPhoto(order.id, file);
      setReceiptUrl(url);
      setExtractingReceipt(true);
      try {
        const text = await extractReceiptData(url, file.type);
        if (text) {
          setForm((f) => ({
            ...f,
            remarks: f.remarks.trim()
              ? `${f.remarks.trim()}\n\n--- Payment Details ---\n${text}`
              : text,
          }));
          // Auto-fill payment amount from "Amount: RM 37.30" line
          const amountMatch = text.match(/Amount[:\s]+(?:RM\s*)?([\d,]+\.?\d*)/i);
          if (amountMatch) {
            const num = parseFloat(amountMatch[1].replace(',', ''));
            if (!isNaN(num)) setForm((f) => ({ ...f, payment_amount: num.toFixed(2) }));
          }
        }
      } catch {
        // extraction is best-effort
      } finally {
        setExtractingReceipt(false);
      }
    } finally {
      setUploadingReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
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
        receipt_photo_url: receiptUrl,
      });
      await updateOrderStatus(order.id, 'In Progress', 'Job Done', 'technician', user?.name ?? '', {
        final_amount: order.quoted_price + extra,
      });

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

  // Pull timestamps from audit log
  const startedAt = auditLogs.find((l) => l.to_status === 'In Progress')?.created_at ?? null;
  const completedAt = auditLogs.find((l) => l.to_status === 'Job Done')?.created_at
    ?? completion?.completed_at
    ?? null;

  if (loading) return <div className="py-20"><LoadingSpinner /></div>;
  if (!order) return <p className="text-center text-gray-500">Job not found</p>;

  const mapsUrl = order.latitude && order.longitude
    ? `https://maps.google.com/maps?q=${order.latitude},${order.longitude}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(order.customer_address)}`;

  const isNew = order.status === 'New';
  const isAssigned = order.status === 'Assigned';
  const isInProgress = order.status === 'In Progress';
  const isDone = ['Job Done', 'Reviewed', 'Closed'].includes(order.status);

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
            className="inline-flex items-center gap-1.5 mt-1 text-sm text-blue-600 font-medium font-mono active:opacity-70"
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
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText size={14} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Problem</p>
              <p className="text-sm text-gray-700 leading-snug">{order.problem_description}</p>
            </div>
          </div>
        )}
        {order.preferred_date && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={14} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Preferred Date</p>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(order.preferred_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
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
          <p className="text-base font-bold font-mono text-gray-900">RM {order.quoted_price.toFixed(2)}</p>
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
        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Navigation size={14} className="text-white" fill="white" />
        </div>
      </a>

      {/* ── Step 1: Start Job ── */}
      <div className={`rounded-2xl border p-4 space-y-3 ${isDone || isInProgress ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone || isInProgress ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>1</span>
            <span className="font-medium text-gray-800">Start Job</span>
          </div>
          {(isDone || isInProgress) && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle size={15} className="flex-shrink-0" />
              <span className="text-xs font-medium">Started</span>
            </div>
          )}
        </div>

        {/* Timestamp row — always show once started */}
        {startedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={13} className="flex-shrink-0 text-gray-400" />
            <span>Started: <span className="font-medium text-gray-700">{fmtDateTime(startedAt)}</span></span>
          </div>
        )}

        {isNew && (
          <p className="text-xs text-gray-400">Waiting for admin to assign this order.</p>
        )}

        {isAssigned && (
          <>
            <p className="text-sm text-gray-500">Tap below when you leave for the job site. A WhatsApp message will be sent to the customer.</p>
            <Button className="w-full" size="lg" loading={starting} onClick={handleStart}>
              Start Job - I'm On My Way
            </Button>
            {otwSent && order.customer_phone && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                <MessageCircle size={15} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700">WhatsApp sent — customer notified you're on the way.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Step 2: Complete Job ── */}
      <div className={`rounded-2xl border p-4 space-y-4 ${isDone ? 'bg-green-50 border-green-100' : isInProgress ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isInProgress ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'}`}>2</span>
            <span className={`font-medium ${isInProgress || isDone ? 'text-gray-800' : 'text-gray-400'}`}>Complete Job</span>
          </div>
          {isDone && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle size={15} className="flex-shrink-0" />
              <span className="text-xs font-medium">Completed</span>
            </div>
          )}
        </div>

        {/* Timestamp row — always show once completed */}
        {completedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={13} className="flex-shrink-0 text-gray-400" />
            <span>Completed: <span className="font-medium text-gray-700">{fmtDateTime(completedAt)}</span></span>
          </div>
        )}

        {(isNew || isAssigned) && (
          <p className="text-xs text-gray-400">Available once you start the job.</p>
        )}

        {isInProgress && (
          <>
            {/* Completion form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Work Details</p>
                {extracting && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Sparkles size={12} /> AI extracting...
                  </span>
                )}
              </div>
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
                <span className="text-lg font-bold font-mono text-green-700">RM {finalAmount.toFixed(2)}</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  {extractingReceipt && (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <Sparkles size={11} /> Reading receipt...
                    </span>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes — receipt details will be auto-filled here"
                />
              </div>
            </div>

            {/* ── Payment Proof ── */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Receipt size={15} className="text-blue-500" />
                <p className="text-sm font-medium text-gray-700">Payment Proof <span className="text-gray-400 font-normal">(optional)</span></p>
                {extractingReceipt && (
                  <span className="ml-auto text-xs text-blue-600 flex items-center gap-1">
                    <Sparkles size={12} /> Reading receipt...
                  </span>
                )}
              </div>

              {receiptUrl && (
                <div className="relative">
                  {receiptUrl.match(/\.pdf($|\?)/i) ? (
                    <div className="w-full rounded-xl border bg-gray-50 px-4 py-4 flex items-center gap-3">
                      <FileText size={28} className="text-red-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700">Receipt PDF uploaded</p>
                        <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">View file</a>
                      </div>
                    </div>
                  ) : (
                    <img src={receiptUrl} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border bg-gray-50" />
                  )}
                  <button
                    onClick={() => { setReceiptUrl(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}


              {!receiptUrl && (
                <>
                  <input ref={receiptInputRef} type="file" accept="image/*,application/pdf" onChange={handleReceiptChange} className="hidden" />
                  <button
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={uploadingReceipt}
                    className="w-full border-2 border-dashed border-blue-200 rounded-xl py-4 text-sm text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition flex items-center justify-center gap-2"
                  >
                    {uploadingReceipt ? <LoadingSpinner size="sm" /> : <Receipt size={16} />}
                    {uploadingReceipt ? 'Uploading...' : 'Photo / screenshot / PDF of customer payment'}
                  </button>
                </>
              )}
            </div>

            {/* ── Payment Received ── */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Payment Received <span className="text-gray-400 font-normal">(optional)</span></p>
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
            </div>

            {/* ── Service Photos ── */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera size={15} className="text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Service Photos</p>
                </div>
                <span className="text-xs font-mono text-gray-400">{photos.length}/{MAX_PHOTOS}</span>
              </div>
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
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/mp4,application/pdf" onChange={handleFileChange} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition flex items-center justify-center gap-2"
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : <Upload size={16} />}
                    {uploading ? 'Uploading...' : 'Add service photos / PDF'}
                  </button>
                </>
              )}
            </div>

            <Button className="w-full" size="lg" loading={submitting} onClick={handleSubmit}>
              Mark Job Done
            </Button>
          </>
        )}

        {isDone && completion && (
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="text-gray-400">Work done:</span> {completion.work_done}</p>
            {completion.remarks && <p><span className="text-gray-400">Remarks:</span> {completion.remarks}</p>}
            <p><span className="text-gray-400">Final amount:</span> <span className="font-bold font-mono text-green-700">RM {completion.final_amount.toFixed(2)}</span></p>
            <div className="flex items-center gap-2 pt-1 text-green-700">
              <MessageCircle size={14} />
              <span className="text-xs">Feedback request sent to customer via WhatsApp.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

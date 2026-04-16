import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, assignTechnician } from '../../api/orders';
import { getTechniciansWithWorkload } from '../../api/technicians';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { TechnicianMapModal } from '../../components/TechnicianMapModal';
import { SERVICE_TYPES } from '../../constants';
import type { Order, TechnicianWithWorkload } from '../../types';
import { ArrowLeft, CheckCircle, User, ClipboardPaste, Copy, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';

const WA_TEMPLATE = `*SejukOps - Service Booking*

Please fill in the details below and send back to us:

*Customer Details*
Name:
Phone:
Address:

*Service Details*
Service: (AC Cleaning / AC Repair / Gas Refill / AC Installation / Inspection)
Problem:
Preferred Date: `;

function parseWhatsAppText(text: string): Partial<{
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  service_type: string;
  problem_description: string;
}> {
  const result: ReturnType<typeof parseWhatsAppText> = {};
  const lines = text.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const value = line.slice(colonIdx + 1).trim();
    if (!value || value.startsWith('(')) continue;

    if (['name', 'customer name', 'nama'].includes(key)) {
      result.customer_name = value;
    } else if (['phone', 'phone number', 'no phone', 'telefon', 'no tel', 'tel'].includes(key)) {
      const digits = value.replace(/\D/g, '');
      result.customer_phone = digits.startsWith('60') ? digits : '60' + digits.replace(/^0/, '');
    } else if (['address', 'alamat', 'addr'].includes(key)) {
      result.customer_address = value;
    } else if (['service', 'service type', 'jenis servis', 'servis'].includes(key)) {
      const match = SERVICE_TYPES.find(
        (s) => s.toLowerCase() === value.toLowerCase() ||
               value.toLowerCase().includes(s.toLowerCase()) ||
               s.toLowerCase().includes(value.toLowerCase())
      );
      if (match) result.service_type = match;
    } else if (['problem', 'problem description', 'issue', 'masalah', 'description'].includes(key)) {
      result.problem_description = value;
    }
  }

  return result;
}

export default function NewOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<TechnicianWithWorkload[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [createdOrderNo, setCreatedOrderNo] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pasteText, setPasteText] = useState('');
  const [pasteOpen, setPasteOpen] = useState(true);
  const [parsedFields, setParsedFields] = useState<string[]>([]);
  const [templateCopied, setTemplateCopied] = useState(false);

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    service_type: '',
    problem_description: '',
    quoted_price: '',
    assigned_technician_id: '',
    admin_notes: '',
  });

  useEffect(() => {
    getTechniciansWithWorkload().then(setTechnicians);
  }, []);

  const handleParse = () => {
    const parsed = parseWhatsAppText(pasteText);
    const filled: string[] = [];
    if (parsed.customer_name) filled.push('Name');
    if (parsed.customer_phone) filled.push('Phone');
    if (parsed.customer_address) filled.push('Address');
    if (parsed.service_type) filled.push('Service');
    if (parsed.problem_description) filled.push('Problem');
    setForm(f => ({ ...f, ...parsed }));
    setParsedFields(filled);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(WA_TEMPLATE).then(() => {
      setTemplateCopied(true);
      setTimeout(() => setTemplateCopied(false), 2000);
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customer_name.trim()) e.customer_name = 'Required';
    if (!form.customer_address.trim()) e.customer_address = 'Required';
    if (!form.service_type) e.service_type = 'Required';
    if (!form.quoted_price || Number(form.quoted_price) < 0) e.quoted_price = 'Enter a valid price';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // Always create the order in 'New' status first (no pre-assigned technician)
      const order = await createOrder({
        ...form,
        quoted_price: Number(form.quoted_price),
        assigned_technician_id: null,   // handled separately below
        created_by: user?.name ?? 'admin',
      });

      // If a technician was selected via the map, properly transition to 'Assigned'
      // so the job appears on the technician's My Jobs page
      if (form.assigned_technician_id) {
        await assignTechnician(order.id, form.assigned_technician_id, user?.name ?? 'admin', 'New');
      }

      setCreatedOrderNo(order.order_no);
      setCreatedOrderId(order.id);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  const inputClass = (key: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[key] ? 'border-red-400' : 'border-gray-300'}`;

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardBody className="text-center py-10">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-1">Order Created!</h2>
            <p className="text-sm text-gray-500 mb-2">Order number</p>
            <p className="font-mono text-lg font-bold text-blue-600 mb-6">{createdOrderNo}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => navigate('/admin/orders/new') || setSubmitted(false)}>
                New Order
              </Button>
              <Button onClick={() => navigate(`/admin/orders/${createdOrderId}`)}>
                View Order
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/orders')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Service Order</h1>
          <p className="text-sm text-gray-500">Order number will be auto-generated</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* WhatsApp Paste */}
        <Card>
          <button
            type="button"
            onClick={() => setPasteOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste size={16} className="text-green-600" />
              <p className="font-medium text-gray-800">Paste from WhatsApp</p>
              <span className="text-xs text-gray-400">— paste customer message to auto-fill form</span>
            </div>
            {pasteOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {pasteOpen && (
            <CardBody className="space-y-3 pt-0">
              {/* Template */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp Template</p>
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {templateCopied ? <><CheckCheck size={13} className="text-green-500" /><span className="text-green-600">Copied!</span></> : <><Copy size={13} />Copy Template</>}
                  </button>
                </div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{WA_TEMPLATE}</pre>
              </div>

              {/* Paste area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paste customer reply here</label>
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => { setPasteText(e.target.value); setParsedFields([]); }}
                  placeholder={"Paste the customer's WhatsApp message here..."}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleParse}
                  disabled={!pasteText.trim()}
                >
                  <ClipboardPaste size={15} />
                  Auto-fill Form
                </Button>
                {parsedFields.length > 0 && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Filled: {parsedFields.join(', ')}
                  </p>
                )}
                {pasteText.trim() && parsedFields.length === 0 && (
                  <p className="text-xs text-gray-400">Click "Auto-fill Form" to parse</p>
                )}
              </div>
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader><p className="font-medium text-gray-800">Customer Details</p></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input {...field('customer_name')} className={inputClass('customer_name')} placeholder="Ahmad bin Abdullah" />
              {errors.customer_name && <p className="text-xs text-red-500 mt-1">{errors.customer_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-500">+60</span>
                <input
                  type="tel"
                  className={`flex-1 border rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customer_phone ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="1126515009"
                  value={form.customer_phone.replace(/^60/, '')}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setForm(f => ({ ...f, customer_phone: '60' + digits }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea {...field('customer_address')} rows={2} className={inputClass('customer_address')} placeholder="No. 12, Jalan Sejuk, Shah Alam" />
              {errors.customer_address && <p className="text-xs text-red-500 mt-1">{errors.customer_address}</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="font-medium text-gray-800">Service Details</p></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <select {...field('service_type')} className={inputClass('service_type')}>
                <option value="">Select service...</option>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.service_type && <p className="text-xs text-red-500 mt-1">{errors.service_type}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description</label>
              <textarea {...field('problem_description')} rows={3} className={inputClass('problem_description')} placeholder="Describe the issue..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quoted Price (RM) *</label>
              <input type="number" min="0" step="0.01" {...field('quoted_price')} className={inputClass('quoted_price')} placeholder="150.00" />
              {errors.quoted_price && <p className="text-xs text-red-500 mt-1">{errors.quoted_price}</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><p className="font-medium text-gray-800">Assignment</p></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Technician</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <User size={15} />
                  {form.assigned_technician_id
                    ? technicians.find(t => t.id === form.assigned_technician_id)?.name ?? 'Select Technician'
                    : 'Select Technician'}
                </button>
                {form.assigned_technician_id && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, assigned_technician_id: '' }))}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Optional — can be assigned later</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
              <textarea {...field('admin_notes')} rows={2} className={inputClass('admin_notes')} placeholder="Internal notes..." />
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" type="button" onClick={() => navigate('/admin/orders')}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Order</Button>
        </div>
      </form>

      {showMap && (
        <TechnicianMapModal
          order={{
            id: '',
            order_no: '',
            customer_name: form.customer_name || 'New Order',
            customer_address: form.customer_address || '',
            customer_phone: form.customer_phone || '',
            service_type: form.service_type || '',
            problem_description: form.problem_description || '',
            quoted_price: Number(form.quoted_price) || 0,
            assigned_technician_id: form.assigned_technician_id || null,
            status: 'New',
            admin_notes: form.admin_notes || '',
            created_by: user?.name ?? 'admin',
            created_at: '',
            updated_at: '',
            latitude: null,
            longitude: null,
          } as Order}
          technicians={technicians}
          onAssign={(techId) => {
            setForm(f => ({ ...f, assigned_technician_id: techId }));
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { 
  ShoppingCart, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  User,
  Mail,
  FileText,
  Download
} from 'lucide-react';

interface RedeemOrder {
  id: string;
  item: {
    id: string;
    name: string;
    description: string | null;
    pointsCost: number;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    reg_no: string | null;
  };
  pointsCost: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  adminNotes: string | null;
  rejectionReason: string | null;
  reportUrl: string | null;
  createdAt: string;
  processedAt: string | null;
}

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<RedeemOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<RedeemOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionData, setActionData] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    adminNotes: '',
    rejectionReason: '',
    reportUrl: '',
  });

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await api.get<{ orders: RedeemOrder[] }>(`/admin/redeem/orders${params}`);
      setOrders(res.data.orders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      showToast('Failed to load orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    
    setIsProcessing(true);
    try {
      const updateData: any = {
        status: actionData.status,
      };
      
      if (actionData.status === 'APPROVED') {
        updateData.adminNotes = actionData.adminNotes;
        updateData.reportUrl = actionData.reportUrl;
      } else {
        updateData.rejectionReason = actionData.rejectionReason;
      }
      
      await api.put(`/admin/redeem/orders/${selectedOrder.id}`, updateData);
      showToast(`Order ${actionData.status.toLowerCase()} successfully`, 'success');
      setSelectedOrder(null);
      setActionData({
        status: 'APPROVED',
        adminNotes: '',
        rejectionReason: '',
        reportUrl: '',
      });
      await fetchOrders();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update order';
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'REJECTED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium text-primary/70">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Orders Management
          </h1>
          <p className="text-lg text-primary/70 font-medium">Manage student redemption orders</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-secondary'
                  : 'bg-secondary text-primary hover:bg-primary/10'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-secondary rounded-xl p-6 border-2 border-primary/10 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-primary mb-2">{order.item.name}</h3>
                    <div className="space-y-2 text-sm text-primary/70">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{order.user.name || 'N/A'}</span>
                        <span className="text-primary/50">•</span>
                        <Mail className="w-4 h-4" />
                        <span>{order.user.email}</span>
                        {order.user.reg_no && (
                          <>
                            <span className="text-primary/50">•</span>
                            <span>Reg: {order.user.reg_no}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>Cost: {order.pointsCost} points</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="font-medium text-sm">{order.status}</span>
                    </div>
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Process
                      </button>
                    )}
                  </div>
                </div>
                {order.adminNotes && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-1">Admin Notes:</p>
                    <p className="text-sm text-blue-700">{order.adminNotes}</p>
                  </div>
                )}
                {order.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{order.rejectionReason}</p>
                  </div>
                )}
                {order.reportUrl && (
                  <div className="mt-4">
                    <a
                      href={order.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Report
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary rounded-xl border-2 border-primary/10">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-lg font-medium text-primary/70">No orders found</p>
          </div>
        )}
      </div>

      {/* Modal for Processing Order */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary rounded-xl p-6 border-2 border-primary/10 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-primary mb-4">Process Order</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-primary/70 mb-1">Item</p>
                <p className="text-primary font-semibold">{selectedOrder.item.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-primary/70 mb-1">Student</p>
                <p className="text-primary">{selectedOrder.user.name || 'N/A'} ({selectedOrder.user.email})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary/70 mb-2">
                  Action
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="APPROVED"
                      checked={actionData.status === 'APPROVED'}
                      onChange={(e) => setActionData({ ...actionData, status: e.target.value as 'APPROVED' })}
                    />
                    <span>Approve</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="REJECTED"
                      checked={actionData.status === 'REJECTED'}
                      onChange={(e) => setActionData({ ...actionData, status: e.target.value as 'REJECTED' })}
                    />
                    <span>Reject</span>
                  </label>
                </div>
              </div>
              {actionData.status === 'APPROVED' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-primary/70 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={actionData.adminNotes}
                      onChange={(e) => setActionData({ ...actionData, adminNotes: e.target.value })}
                      className="w-full border border-primary/20 rounded-lg px-4 py-2 text-primary bg-background"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary/70 mb-2">
                      Report URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={actionData.reportUrl}
                      onChange={(e) => setActionData({ ...actionData, reportUrl: e.target.value })}
                      className="w-full border border-primary/20 rounded-lg px-4 py-2 text-primary bg-background"
                      placeholder="https://..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-primary/70 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={actionData.rejectionReason}
                    onChange={(e) => setActionData({ ...actionData, rejectionReason: e.target.value })}
                    className="w-full border border-primary/20 rounded-lg px-4 py-2 text-primary bg-background"
                    rows={3}
                    required
                  />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateOrder}
                  disabled={isProcessing || (actionData.status === 'REJECTED' && !actionData.rejectionReason)}
                  className="flex-1 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setActionData({
                      status: 'APPROVED',
                      adminNotes: '',
                      rejectionReason: '',
                      reportUrl: '',
                    });
                  }}
                  className="px-4 py-2 bg-secondary text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


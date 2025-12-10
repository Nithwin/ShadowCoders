'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { 
  Gift, 
  Coins, 
  ShoppingCart, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface RedeemItem {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  isActive: boolean;
  itemType: string;
  metadata: any;
}

interface RedeemOrder {
  id: string;
  item: RedeemItem;
  pointsCost: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  leaveDate: string | null;
  message: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  reportUrl: string | null;
  createdAt: string;
  processedAt: string | null;
}

export default function RedeemPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<RedeemItem[]>([]);
  const [orders, setOrders] = useState<RedeemOrder[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RedeemItem | null>(null);
  const [leaveDate, setLeaveDate] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, ordersRes, pointsRes] = await Promise.all([
        api.get<RedeemItem[]>('/student/redeem/items'),
        api.get<{ orders: RedeemOrder[]; pagination?: any }>('/student/redeem/orders'),
        api.get<{ points: number }>('/student/points'),
      ]);
      setItems(itemsRes.data);
      setOrders(ordersRes.data.orders || []);
      setPoints(pointsRes.data.points);
    } catch (error: any) {
      console.error('Error fetching redeem data:', error);
      showToast('Failed to load redeem items', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemClick = (item: RedeemItem) => {
    setSelectedItem(item);
    setLeaveDate('');
    setMessage('');
  };

  const handleRedeem = async () => {
    if (!selectedItem) return;
    
    setIsRedeeming(selectedItem.id);
    try {
      const order = await api.post<RedeemOrder>('/student/redeem/orders', {
        itemId: selectedItem.id,
        leaveDate: leaveDate || undefined,
        message: message || undefined,
      });
      showToast('Order placed successfully! Waiting for admin approval.', 'success');
      setSelectedItem(null);
      setLeaveDate('');
      setMessage('');
      await fetchData(); // Refresh data
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to place order';
      showToast(errorMessage, 'error');
    } finally {
      setIsRedeeming(null);
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
          <p className="text-lg font-medium text-primary/70">Loading redeem items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Redeem Points
          </h1>
          <p className="text-lg text-primary/70 font-medium">Exchange your points for rewards</p>
        </div>

        {/* Points Display */}
        <div className="bg-gradient-to-br from-yellow-500/15 via-yellow-500/10 to-yellow-500/15 rounded-xl p-6 border border-yellow-500/30 shadow-xl mb-8 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl -ml-12 -mb-12"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-lg animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-lg">
                  <Coins className="w-10 h-10 text-white drop-shadow-lg" fill="currentColor" />
                </div>
              </div>
              <div>
                <p className="text-sm text-primary/60 font-medium mb-1">Available Points</p>
                <p className="text-5xl font-bold bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-600 bg-clip-text text-transparent">{points.toLocaleString()}</p>
              </div>
            </div>
            <Link
              href="/student/redeem/history"
              className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              View History
            </Link>
          </div>
        </div>

        {/* Available Items */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary mb-4">Available Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-secondary rounded-xl p-6 border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500/20 to-yellow-500/15 border border-yellow-500/30 rounded-full shadow-sm">
                    <Coins className="w-4 h-4 text-yellow-600" fill="currentColor" />
                    <span className="font-bold text-yellow-700">{item.pointsCost.toLocaleString()}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">{item.name}</h3>
                {item.description && (
                  <p className="text-primary/70 mb-4 text-sm">{item.description}</p>
                )}
                <button
                  onClick={() => handleRedeemClick(item)}
                  disabled={isRedeeming === item.id || points < item.pointsCost || !item.isActive}
                  className="w-full px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRedeeming === item.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : points < item.pointsCost ? (
                    'Insufficient Points'
                  ) : !item.isActive ? (
                    'Not Available'
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Redeem Now
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          {items.length === 0 && (
            <div className="text-center py-12 bg-secondary rounded-xl border-2 border-primary/10">
              <Gift className="w-16 h-16 mx-auto mb-4 text-primary/30" />
              <p className="text-lg font-medium text-primary/70">No items available at the moment</p>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div>
          <h2 className="text-2xl font-bold text-primary mb-4">My Orders</h2>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="bg-secondary rounded-xl p-6 border-2 border-primary/10 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-primary mb-1">{order.item.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-primary/60 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-600" fill="currentColor" />
                          {order.pointsCost.toLocaleString()} points
                        </span>
                        {order.leaveDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Leave: {new Date(order.leaveDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {order.message && (
                        <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                          <p className="text-sm font-medium text-primary mb-1">Your Message:</p>
                          <p className="text-sm text-primary/70">{order.message}</p>
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="font-medium text-sm">{order.status}</span>
                    </div>
                  </div>
                  {order.rejectionReason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                          <p className="text-sm text-red-700">{order.rejectionReason}</p>
                        </div>
                      </div>
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
                        View Report
                        <span>→</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {orders.length > 5 && (
                <Link
                  href="/student/redeem/history"
                  className="block text-center py-4 text-primary hover:text-primary/80 font-medium"
                >
                  View All Orders →
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-secondary rounded-xl border-2 border-primary/10">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-primary/30" />
              <p className="text-lg font-medium text-primary/70">No orders yet</p>
              <p className="text-sm text-primary/50 mt-1">Redeem items to see your orders here</p>
            </div>
          )}
        </div>
      </div>

      {/* Redeem Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary rounded-xl p-6 max-w-md w-full border-2 border-primary/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-primary mb-4">Redeem {selectedItem.name}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Leave Date <span className="text-primary/60">(optional)</span>
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-background border-2 border-primary/20 rounded-lg text-primary focus:outline-none focus:border-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Message/Reason <span className="text-primary/60">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your reason for leave..."
                  rows={4}
                  className="w-full px-4 py-2 bg-background border-2 border-primary/20 rounded-lg text-primary focus:outline-none focus:border-primary resize-none"
                />
              </div>
              
              <div className="bg-gradient-to-r from-yellow-500/15 to-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg">
                    <Coins className="w-3.5 h-3.5 text-white" fill="currentColor" />
                  </div>
                  <span className="text-sm font-semibold text-primary">Cost: <span className="text-yellow-700 font-bold">{selectedItem.pointsCost.toLocaleString()}</span> points</span>
                </div>
                <p className="text-xs text-primary/60 ml-7">Your current balance: <span className="font-semibold text-primary">{points.toLocaleString()}</span> points</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setLeaveDate('');
                  setMessage('');
                }}
                className="flex-1 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={isRedeeming === selectedItem.id}
                className="flex-1 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRedeeming === selectedItem.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Confirm Redeem
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


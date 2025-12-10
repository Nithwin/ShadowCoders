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
  AlertCircle,
  Sparkles,
  TrendingUp,
  X,
  ArrowRight,
  Package
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
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary relative z-10" />
          </div>
          <p className="text-xl font-semibold text-primary/80">Loading your rewards...</p>
          <p className="text-sm text-primary/50 mt-2">Preparing amazing items for you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header and Balance in Single Row */}
        <div className="mb-8 pt-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Rewards Store Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold font-alan-sans text-primary">
                Rewards Store
              </h1>
            </div>
            
            {/* Balance and Order History */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="currentColor" />
                <div>
                  <p className="text-xs text-primary/60 font-medium mb-0.5">Balance</p>
                  <p className="text-lg sm:text-xl font-bold text-primary">
                    {points.toLocaleString()} <span className="text-sm font-normal text-primary/70">pts</span>
                  </p>
                </div>
              </div>
              <Link
                href="/student/redeem/history"
                className="px-3 py-2 sm:px-4 sm:py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 transition-colors font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Order History</span>
                <span className="sm:hidden">History</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Available Items Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-1">Available Rewards</h2>
              <p className="text-sm text-primary/60">Choose from our curated selection</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{items.length} items</span>
            </div>
          </div>
          
          {items.length > 0 ? (
            <div className={`grid grid-cols-1 ${items.length === 1 ? 'sm:grid-cols-1 max-w-md mx-auto' : items.length === 2 ? 'sm:grid-cols-2 max-w-4xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-6`}>
                {items.map((item) => {
                  const canAfford = points >= item.pointsCost;
                  const isDisabled = isRedeeming === item.id || !canAfford || !item.isActive;
                  
                  return (
                    <div
                      key={item.id}
                      className={`group relative bg-secondary rounded-2xl p-6 sm:p-7 border-2 transition-all duration-300 flex flex-col h-full min-h-[340px] ${
                        isDisabled 
                          ? 'border-primary/10 shadow-md opacity-75' 
                          : 'border-primary/20 shadow-lg hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1'
                      }`}
                    >
                      {/* Card glow effect */}
                      {!isDisabled && (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      )}
                      
                      <div className="relative z-10 flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-5">
                          <div className={`p-3.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                            isDisabled ? 'bg-primary/5' : 'bg-gradient-to-br from-primary/10 to-primary/5'
                          }`}>
                            <Gift className={`w-6 h-6 ${isDisabled ? 'text-primary/40' : 'text-primary'}`} />
                          </div>
                          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-300 ${
                            canAfford 
                              ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-500/15 border-yellow-500/40 shadow-sm' 
                              : 'bg-gray-100 border-gray-300'
                          }`}>
                            <Coins className={`w-4 h-4 ${canAfford ? 'text-yellow-600' : 'text-gray-500'}`} fill="currentColor" />
                            <span className={`font-bold text-sm ${canAfford ? 'text-yellow-700' : 'text-gray-600'}`}>
                              {item.pointsCost.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-grow">
                          <h3 className={`text-xl sm:text-2xl font-bold mb-3 ${isDisabled ? 'text-primary/60' : 'text-primary'}`}>
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className={`text-sm leading-relaxed ${isDisabled ? 'text-primary/50' : 'text-primary/70'}`}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="mt-6 pt-6 border-t border-primary/10">
                          <button
                            onClick={() => handleRedeemClick(item)}
                            disabled={isDisabled}
                            className={`w-full px-5 py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                              isDisabled
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-primary text-secondary hover:bg-primary/90 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0'
                            }`}
                          >
                            {isRedeeming === item.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : !item.isActive ? (
                              <>
                                <XCircle className="w-4 h-4" />
                                Not Available
                              </>
                            ) : !canAfford ? (
                              <>
                                <AlertCircle className="w-4 h-4" />
                                Insufficient Points
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-4 h-4" />
                                Redeem Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-secondary rounded-2xl border-2 border-primary/10 shadow-lg">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"></div>
                  <Gift className="w-20 h-20 mx-auto text-primary/30 relative z-10" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">No Rewards Available</h3>
                <p className="text-primary/60 max-w-md mx-auto">
                  Check back soon for new exciting rewards to redeem with your points!
                </p>
              </div>
            )}
          </div>

        {/* Recent Orders Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-1">Recent Orders</h2>
              <p className="text-sm text-primary/60">Track your redemption requests</p>
            </div>
            {orders.length > 5 && (
              <Link
                href="/student/redeem/history"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="bg-secondary rounded-xl p-5 sm:p-6 border-2 border-primary/10 shadow-md hover:shadow-lg transition-all duration-300 hover:border-primary/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg sm:text-xl font-bold text-primary">{order.item.name}</h3>
                        <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 flex-shrink-0 ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="font-semibold text-xs sm:text-sm">{order.status}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-primary/60">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-yellow-600" fill="currentColor" />
                          <span className="font-semibold">{order.pointsCost.toLocaleString()}</span> points
                        </span>
                        {order.leaveDate && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Leave: {new Date(order.leaveDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {order.message && (
                        <div className="mt-3 p-3.5 bg-primary/5 border border-primary/10 rounded-lg">
                          <p className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">Your Message</p>
                          <p className="text-sm text-primary/70 leading-relaxed">{order.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {order.rejectionReason && (
                    <div className="mt-4 p-4 bg-red-50/80 border-2 border-red-200 rounded-lg">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700 leading-relaxed">{order.rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {order.reportUrl && (
                    <div className="mt-4 pt-4 border-t border-primary/10">
                      <a
                        href={order.reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors group/link"
                      >
                        View Report
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
              
              {orders.length > 5 && (
                <Link
                  href="/student/redeem/history"
                  className="block text-center py-5 text-primary hover:text-primary/80 font-semibold transition-colors sm:hidden"
                >
                  View All Orders
                  <ArrowRight className="w-4 h-4 inline-block ml-2" />
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-16 bg-secondary rounded-2xl border-2 border-primary/10 shadow-lg">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"></div>
                <ShoppingCart className="w-20 h-20 mx-auto text-primary/30 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">No Orders Yet</h3>
              <p className="text-primary/60 max-w-md mx-auto mb-4">
                Start redeeming items to see your order history here
              </p>
              {items.length > 0 && (
                <p className="text-sm text-primary/50">
                  Browse available rewards above to get started!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Redeem Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedItem(null);
              setLeaveDate('');
              setMessage('');
            }
          }}
        >
          <div className="bg-secondary rounded-2xl p-6 sm:p-8 max-w-md w-full border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-primary">Redeem {selectedItem.name}</h2>
                </div>
                <p className="text-sm text-primary/60 ml-12">Complete your redemption request</p>
              </div>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setLeaveDate('');
                  setMessage('');
                }}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary/60 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-5 mb-6">
              {/* Leave Date Input */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2.5">
                  Leave Date
                  <span className="text-primary/50 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-background border-2 border-primary/20 rounded-xl text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              
              {/* Message Textarea */}
              <div>
                <label className="block text-sm font-semibold text-primary mb-2.5">
                  Message / Reason
                  <span className="text-primary/50 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your reason for leave or any additional message..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border-2 border-primary/20 rounded-xl text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none font-medium placeholder:text-primary/40"
                />
              </div>
              
              {/* Points Summary */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-sm">
                    <Coins className="w-4 h-4 text-white" fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-yellow-900/60 uppercase tracking-wide mb-1">Redemption Cost</p>
                    <p className="text-lg font-bold text-yellow-800">
                      {selectedItem.pointsCost.toLocaleString()} <span className="text-sm font-normal text-yellow-700/70">points</span>
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-yellow-200/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-yellow-900/70 font-medium">Your Balance:</span>
                    <span className="font-bold text-yellow-800">{points.toLocaleString()} points</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-yellow-900/70 font-medium">After Redemption:</span>
                    <span className={`font-bold ${points - selectedItem.pointsCost >= 0 ? 'text-yellow-800' : 'text-red-600'}`}>
                      {(points - selectedItem.pointsCost).toLocaleString()} points
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-primary/10">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setLeaveDate('');
                  setMessage('');
                }}
                className="flex-1 px-5 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={isRedeeming === selectedItem.id}
                className="flex-1 px-5 py-3 bg-primary text-secondary rounded-xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
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


'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  Gift, 
  Coins, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface RedeemOrder {
  id: string;
  item: {
    id: string;
    name: string;
    description: string | null;
  };
  pointsCost: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  adminNotes: string | null;
  rejectionReason: string | null;
  reportUrl: string | null;
  createdAt: string;
  processedAt: string | null;
}

export default function RedeemHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RedeemOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ orders: RedeemOrder[] }>('/student/redeem/orders');
      setOrders(res.data.orders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
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
          <p className="text-lg font-medium text-primary/70">Loading order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-primary min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mb-8">
        <Link
          href="/student/redeem"
          className="inline-flex items-center gap-2 text-primary/70 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Redeem
        </Link>
        <div className="mb-6">
          <h1 className="text-5xl font-bold font-alan-sans mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Redeem History
          </h1>
          <p className="text-lg text-primary/70 font-medium">View all your redemption orders</p>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-secondary rounded-xl p-6 border-2 border-primary/10 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-primary mb-1">{order.item.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-primary/60">
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
                        <Coins className="w-4 h-4" />
                        {order.pointsCost} points
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="font-medium text-sm">{order.status}</span>
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
                {order.processedAt && (
                  <div className="mt-4 text-xs text-primary/50">
                    Processed on: {new Date(order.processedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary rounded-xl border-2 border-primary/10">
            <Gift className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-lg font-medium text-primary/70">No orders yet</p>
            <p className="text-sm text-primary/50 mt-1">Redeem items to see your orders here</p>
          </div>
        )}
      </div>
    </div>
  );
}


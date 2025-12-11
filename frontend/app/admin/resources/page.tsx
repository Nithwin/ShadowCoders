'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Network,
  Server,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface SystemResources {
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    processors: number;
    speed: string;
    usage: number;
    load: number[];
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    active: number;
    available: number;
    usage: number;
    swapTotal: number;
    swapUsed: number;
    swapFree: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    filesystem: string;
    type: string;
  }[];
  network: {
    iface: string;
    operstate: string;
    rx_bytes: number;
    tx_bytes: number;
    rx_sec: number;
    tx_sec: number;
  }[];
  uptime: number;
  platform: string;
  hostname: string;
  timestamp: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function getUsageColor(usage: number): string {
  if (usage >= 90) return 'text-red-500';
  if (usage >= 70) return 'text-yellow-500';
  return 'text-green-500';
}

function getUsageBgColor(usage: number): string {
  if (usage >= 90) return 'bg-red-500';
  if (usage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function ResourceMonitoringPage() {
  useAuth();
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<SystemResources>('/admin/system/resources');
      setResources(res.data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching system resources:', err);
      setError(err.response?.data?.message || 'Failed to fetch system resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  if (isLoading && !resources) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !resources) {
    return (
      <div className="text-primary">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-500">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchResources}
          className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!resources) return null;

  return (
    <div className="text-primary space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Resource Monitoring</h1>
          <p className="text-secondary/70">
            Real-time server resource usage and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary/50 rounded-lg p-4 border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Hostname</h3>
          </div>
          <p className="text-sm text-secondary/70">{resources.hostname}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-4 border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Platform</h3>
          </div>
          <p className="text-sm text-secondary/70">{resources.platform}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-4 border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Uptime</h3>
          </div>
          <p className="text-sm text-secondary/70">{formatUptime(resources.uptime)}</p>
        </div>
      </div>

      {/* CPU Card */}
      <div className="bg-secondary/50 rounded-lg p-6 border border-secondary/20">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">CPU</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-secondary/70 mb-1">Manufacturer</p>
            <p className="font-semibold">{resources.cpu.manufacturer}</p>
          </div>
          <div>
            <p className="text-sm text-secondary/70 mb-1">Model</p>
            <p className="font-semibold">{resources.cpu.brand}</p>
          </div>
          <div>
            <p className="text-sm text-secondary/70 mb-1">Cores</p>
            <p className="font-semibold">
              {resources.cpu.physicalCores} physical / {resources.cpu.cores} logical
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary/70 mb-1">Speed</p>
            <p className="font-semibold">{resources.cpu.speed}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">CPU Usage</span>
              <span className={`text-sm font-bold ${getUsageColor(resources.cpu.usage)}`}>
                {resources.cpu.usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getUsageBgColor(resources.cpu.usage)} transition-all duration-300`}
                style={{ width: `${Math.min(resources.cpu.usage, 100)}%` }}
              />
            </div>
          </div>
          {resources.cpu.temperature && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Temperature</span>
                <span className={`text-sm font-bold ${
                  resources.cpu.temperature > 80 ? 'text-red-500' : 
                  resources.cpu.temperature > 60 ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {resources.cpu.temperature}°C
                </span>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm text-secondary/70 mb-1">Load Average</p>
            <p className="font-semibold">
              {resources.cpu.load.map((load, i) => (
                <span key={i} className="mr-2">
                  {i === 0 ? '1m' : i === 1 ? '5m' : '15m'}: {load.toFixed(2)}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Memory Card */}
      <div className="bg-secondary/50 rounded-lg p-6 border border-secondary/20">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Memory</h2>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Memory Usage</span>
              <span className={`text-sm font-bold ${getUsageColor(resources.memory.usage)}`}>
                {resources.memory.usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getUsageBgColor(resources.memory.usage)} transition-all duration-300`}
                style={{ width: `${Math.min(resources.memory.usage, 100)}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-secondary/70 mb-1">Total</p>
              <p className="font-semibold">{formatBytes(resources.memory.total)}</p>
            </div>
            <div>
              <p className="text-sm text-secondary/70 mb-1">Used</p>
              <p className="font-semibold">{formatBytes(resources.memory.used)}</p>
            </div>
            <div>
              <p className="text-sm text-secondary/70 mb-1">Free</p>
              <p className="font-semibold">{formatBytes(resources.memory.free)}</p>
            </div>
            <div>
              <p className="text-sm text-secondary/70 mb-1">Available</p>
              <p className="font-semibold">{formatBytes(resources.memory.available)}</p>
            </div>
          </div>
          {resources.memory.swapTotal > 0 && (
            <div className="mt-4 pt-4 border-t border-secondary/20">
              <p className="text-sm font-semibold mb-2">Swap</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-secondary/70 mb-1">Total</p>
                  <p className="font-semibold">{formatBytes(resources.memory.swapTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary/70 mb-1">Used</p>
                  <p className="font-semibold">{formatBytes(resources.memory.swapUsed)}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary/70 mb-1">Free</p>
                  <p className="font-semibold">{formatBytes(resources.memory.swapFree)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disk Card */}
      <div className="bg-secondary/50 rounded-lg p-6 border border-secondary/20">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Disk Storage</h2>
        </div>
        <div className="space-y-4">
          {resources.disk.map((disk, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{disk.filesystem} ({disk.type})</p>
                </div>
                <span className={`text-sm font-bold ${getUsageColor(disk.usage)}`}>
                  {disk.usage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getUsageBgColor(disk.usage)} transition-all duration-300`}
                  style={{ width: `${Math.min(disk.usage, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-secondary/70 mb-1">Total</p>
                  <p className="font-semibold">{formatBytes(disk.total)}</p>
                </div>
                <div>
                  <p className="text-secondary/70 mb-1">Used</p>
                  <p className="font-semibold">{formatBytes(disk.used)}</p>
                </div>
                <div>
                  <p className="text-secondary/70 mb-1">Free</p>
                  <p className="font-semibold">{formatBytes(disk.free)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Card */}
      {resources.network.length > 0 && (
        <div className="bg-secondary/50 rounded-lg p-6 border border-secondary/20">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Network</h2>
          </div>
          <div className="space-y-4">
            {resources.network.map((iface, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{iface.iface}</p>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">
                    {iface.operstate}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-secondary/70 mb-1">Received</p>
                    <p className="font-semibold">{formatBytes(iface.rx_bytes)}</p>
                    {iface.rx_sec > 0 && (
                      <p className="text-xs text-secondary/50">{formatBytes(iface.rx_sec)}/s</p>
                    )}
                  </div>
                  <div>
                    <p className="text-secondary/70 mb-1">Transmitted</p>
                    <p className="font-semibold">{formatBytes(iface.tx_bytes)}</p>
                    {iface.tx_sec > 0 && (
                      <p className="text-xs text-secondary/50">{formatBytes(iface.tx_sec)}/s</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-center text-sm text-secondary/50">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}


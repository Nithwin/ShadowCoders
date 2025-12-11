import si from 'systeminformation';
import os from 'os';

export interface SystemResources {
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

export async function getSystemResources(): Promise<SystemResources> {
    try {
        // Get all system information in parallel for better performance
        const [
            cpuInfo,
            cpuCurrentSpeed,
            cpuTemperature,
            memInfo,
            fsSize,
            networkStats,
            timeInfo,
            systemInfo,
        ] = await Promise.all([
            si.cpu(),
            si.cpuCurrentSpeed(),
            si.cpuTemperature().catch(() => null), // May fail on some systems
            si.mem(),
            si.fsSize(),
            si.networkStats(),
            si.time(),
            si.system(),
        ]);

        // Calculate CPU usage
        const cpuUsage = await si.currentLoad().catch(() => ({ currentLoad: 0, avgload: 0 }));
        // Use Node.js os.loadavg() instead of systeminformation
        const loadAvg = os.loadavg();

        // Get main disk (usually the first one or the one with the most space)
        const mainDisk = fsSize.length > 0 
            ? fsSize.sort((a, b) => b.size - a.size)[0]
            : null;

        // Format network interfaces
        const networkInterfaces = networkStats
            .filter(iface => iface.operstate === 'up')
            .map(iface => ({
                iface: iface.iface,
                operstate: iface.operstate,
                rx_bytes: iface.rx_bytes || 0,
                tx_bytes: iface.tx_bytes || 0,
                rx_sec: iface.rx_sec || 0,
                tx_sec: iface.tx_sec || 0,
            }));

        // Calculate memory usage percentage
        const memoryUsage = memInfo.total > 0 
            ? ((memInfo.used / memInfo.total) * 100)
            : 0;

        // Calculate disk usage for all disks
        const disks = fsSize.map(disk => ({
            total: disk.size,
            used: disk.used,
            free: disk.available,
            usage: disk.size > 0 ? ((disk.used / disk.size) * 100) : 0,
            filesystem: disk.fs || 'unknown',
            type: disk.type || 'unknown',
        }));

        return {
            cpu: {
                manufacturer: cpuInfo.manufacturer || 'Unknown',
                brand: cpuInfo.brand || 'Unknown',
                cores: cpuInfo.cores || 0,
                physicalCores: cpuInfo.physicalCores || 0,
                processors: cpuInfo.processors || 1,
                speed: cpuCurrentSpeed.avg ? `${cpuCurrentSpeed.avg} GHz` : 'Unknown',
                usage: cpuUsage.currentLoad || 0,
                load: loadAvg,
                ...(cpuTemperature?.main !== undefined && { temperature: cpuTemperature.main }),
            },
            memory: {
                total: memInfo.total,
                used: memInfo.used,
                free: memInfo.free,
                active: memInfo.active,
                available: memInfo.available,
                usage: memoryUsage,
                swapTotal: memInfo.swaptotal,
                swapUsed: memInfo.swapused,
                swapFree: memInfo.swapfree,
            },
            disk: disks,
            network: networkInterfaces,
            uptime: timeInfo.uptime || 0,
            platform: `${systemInfo.manufacturer || ''} ${systemInfo.model || ''} ${systemInfo.version || ''}`.trim() || os.platform(),
            hostname: os.hostname(),
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error fetching system resources:', error);
        throw new Error('Failed to fetch system resources');
    }
}


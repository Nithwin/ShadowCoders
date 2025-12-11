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
export declare function getSystemResources(): Promise<SystemResources>;
//# sourceMappingURL=system.service.d.ts.map
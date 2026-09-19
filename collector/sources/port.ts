import { Socket } from 'node:net';

import { PORT_TIMEOUT_MS } from '@/lib/constants';

/**
 * Oyun portu canlı mı? Bağlantı kurulur kurulmaz kapatırız — oyun protokolüne
 * hiçbir paket göndermeyiz, sunucuya yük bindirmeyiz.
 */

export type PortSample = {
  up: boolean | null;
  error: string | null;
};

export function checkPort(
  host: string,
  port: number,
  timeoutMs: number = PORT_TIMEOUT_MS,
): Promise<PortSample> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (sample: PortSample): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(sample);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ up: true, error: null }));
    socket.once('timeout', () => finish({ up: false, error: 'bağlantı zaman aşımı' }));
    socket.once('error', (error: Error) => finish({ up: false, error: error.message }));

    try {
      socket.connect({ host, port });
    } catch (error) {
      finish({ up: null, error: error instanceof Error ? error.message : String(error) });
    }
  });
}

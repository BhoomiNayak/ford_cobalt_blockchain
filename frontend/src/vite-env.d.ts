/// <reference types="vite/client" />

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}

interface Window {
  ethereum?: EthereumProvider;
}

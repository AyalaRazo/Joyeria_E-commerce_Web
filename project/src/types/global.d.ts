export {};

declare global {
  interface Window {
    fbq: {
      (method: 'init', pixelId: string): void;
      (method: 'track', eventName: string, parameters?: Record<string, any>): void;
      (method: 'trackCustom', eventName: string, parameters?: Record<string, any>): void;
    };
  }
}
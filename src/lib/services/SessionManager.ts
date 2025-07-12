import { log } from "@/lib/utils/logging"
const logger = log.getLogger("session")

type MessageResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

// Safe chrome type for web build (solo se non già dichiarato)
declare global {
  interface Window {
    // chrome: any; // RIMOSSO: causa conflitto con @types/chrome
  }
}

export class SessionManager {
  private port: any = null;
  private messageHandlers: Map<string, (response: MessageResponse) => void> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
      this.port = window.chrome.runtime.connect({ name: 'session-manager' });

      this.port.onMessage.addListener((message: MessageResponse & { messageId?: string }) => {
        if (message.messageId) {
          const handler = this.messageHandlers.get(message.messageId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.messageId);
          }
        }
      });
    } else {
      logger.warn('SessionManager: chrome.runtime is not available. Running in web mode?');
    }
  }

  private async sendMessage(type: string, payload?: any): Promise<MessageResponse> {
    if (!this.port) {
      return { success: false, error: 'chrome.runtime not available' };
    }
    return new Promise((resolve) => {
      const messageId = crypto.randomUUID();
      this.messageHandlers.set(messageId, resolve);
      this.port.postMessage({
        type,
        payload,
        messageId
      });
    });
  }

  async startSession(jwk: string, duration?: number): Promise<void> {
    logger.info('SessionManager: Starting session', jwk, duration)
    const response = await this.sendMessage('startSession', { jwk, duration })
    if (!response.success) {
      throw new Error(response.error || 'Failed to start session')
    }
  }

  async extendSession(duration?: number): Promise<void> {
    const response = await this.sendMessage('extendSession', { duration })
    if (!response.success) {
      throw new Error(response.error || 'Failed to extend session')
    }
  }

  async checkSession(): Promise<{ active: boolean, jwk?: string }> {
    const response = await this.sendMessage('checkSession')
    if (!response.success) {
      throw new Error(response.error || 'Failed to check session')
    }
    return response.data
  }

  async endSession(): Promise<void> {
    const response = await this.sendMessage('endSession')
    if (!response.success) {
      throw new Error(response.error || 'Failed to end session')
    }
  }

  async recordActivity(): Promise<void> {
    try {
      await this.sendMessage('recordActivity')
    } catch (error) {
      logger.warn('Failed to record activity:', error)
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager()
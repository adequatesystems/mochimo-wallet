import { log } from "@/lib/utils/logging"
const logger = log.getLogger("session");

interface SessionConfig {
  allowedOrigins: string[]
  disconnectGracePeriod?: number // minutes before locking after disconnect
}

interface SessionWorkerMessage {
  type: string
  payload?: any
  messageId: string
}

class SessionWorkerManager {
  private sessionData: {
    jwk?: string
    disconnectedAt?: number
  } = {}
  
  private connections: Map<string, chrome.runtime.Port> = new Map()
  private allowedOrigins: Set<string>

  private disconnectGracePeriod: number
  private lockTimeout?: NodeJS.Timeout

  constructor(config: SessionConfig) {
    this.allowedOrigins = new Set(config.allowedOrigins || [])
    this.disconnectGracePeriod = (config.disconnectGracePeriod || 5) * 60 * 1000
    chrome.runtime.onConnect.addListener(this.handleConnection.bind(this))
  }

  private verifyOrigin(port: chrome.runtime.Port): boolean {
    if (port.sender?.id === chrome.runtime.id) {
      return true
    }
    if (port.sender?.origin) {
      return this.allowedOrigins.has(port.sender.origin)
    }
    return false
  }

  private handleConnection(port: chrome.runtime.Port) {
    if (port.name !== 'session-manager') return

    if (!this.verifyOrigin(port)) {
      logger.warn('Unauthorized connection attempt:', port.sender?.origin || port.sender?.id)
      port.disconnect()
      return
    }

    const id = crypto.randomUUID()
    this.connections.set(id, port)

    // Check session validity regardless of timeout state
    if (this.sessionData.jwk) {
      const timeSinceDisconnect = this.sessionData.disconnectedAt 
        ? Date.now() - this.sessionData.disconnectedAt
        : 0

      if (timeSinceDisconnect < this.disconnectGracePeriod) {
        // Valid session, clear any existing timeout
        if (this.lockTimeout) {
          clearTimeout(this.lockTimeout)
          this.lockTimeout = undefined
        }
        this.sessionData.disconnectedAt = undefined
      } else {
        // Session expired, clean up
        this.handleEndSession()
        port.postMessage({
          type: 'sessionExpired',
          data: { timestamp: Date.now() }
        })
      }
    }

    port.onMessage.addListener((message: SessionWorkerMessage) => 
      this.handleMessage(message, port)
    )

    port.onDisconnect.addListener(() => {
      this.connections.delete(id)
      this.handleDisconnect()
    })
  }

  private handleDisconnect() {
    // If this was the last connection, start the grace period
    if (this.connections.size === 0 && this.sessionData.jwk) {
      this.sessionData.disconnectedAt = Date.now()
      
      // Set timeout to end session after grace period
      this.lockTimeout = setTimeout(() => {
        this.handleEndSession()
        // Notify any new connections that might have connected
        this.connections.forEach(port => {
          port.postMessage({
            type: 'sessionExpired',
            data: { timestamp: Date.now() }
          })
        })
      }, this.disconnectGracePeriod)
    }
  }

  private async handleMessage(message: SessionWorkerMessage, port: chrome.runtime.Port) {
    if(port.name !== 'session-manager') return
    try {
      let response: any

      switch (message.type) {
        case 'startSession':
          response = await this.handleStartSession(message.payload)
          break

        case 'checkSession':
          response = await this.handleCheckSession()
          break

        case 'endSession':
          response = await this.handleEndSession()
          break

        default:
          throw new Error('Unknown message type')
      }

      port.postMessage({
        success: true,
        data: response,
        messageId: message.messageId
      })
    } catch (error) {
      port.postMessage({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: message.messageId
      })
    }
  }

  private cleanup() {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout)
      this.lockTimeout = undefined
    }
  }

  private handleStartSession(payload: { jwk: string }): void {
    // Clear any existing session first
    this.handleEndSession()
    
    this.sessionData = {
      jwk: payload.jwk,
      disconnectedAt: undefined
    }
  }

  private handleCheckSession(): { active: boolean, jwk?: string } {
    if (!this.sessionData.jwk) {
      return { active: false }
    }

    // Atomic check of session validity
    if (this.sessionData.disconnectedAt) {
      const timeSinceDisconnect = Date.now() - this.sessionData.disconnectedAt
      if (timeSinceDisconnect > this.disconnectGracePeriod) {
        this.handleEndSession()
        return { active: false }
      }
    }

    // Return session data only if we got here (session is valid)
    return {
      active: true,
      jwk: this.sessionData.jwk
    }
  }

  private handleEndSession(): void {
    this.cleanup()
    this.sessionData = {}
    
    // Notify all connections
    this.connections.forEach(port => {
      port.postMessage({
        type: 'sessionEnded',
        data: { timestamp: Date.now() }
      })
    })
  }

  // Add destructor method
  public destroy() {
    this.cleanup()
    this.connections.forEach(port => port.disconnect())
    this.connections.clear()
    chrome.runtime.onConnect.removeListener(this.handleConnection.bind(this))
  }
}
// Initialize the session worker
const sessionWorker = new SessionWorkerManager({
  disconnectGracePeriod: 15, // 15 minutes
  allowedOrigins: [] // Only allow connections from our own extension
})

// Listen for extension shutdown/unload
chrome.runtime.onSuspend.addListener(() => {
  sessionWorker.destroy()
})

//  Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
  sessionWorker.destroy()
  chrome.runtime.reload()
})

// Handle unexpected errors
self.addEventListener('unload', () => {
  sessionWorker.destroy()
})

// Handle unexpected errors that might crash the service worker
globalThis.addEventListener('error', (event) => {
  sessionWorker.destroy();

}) 
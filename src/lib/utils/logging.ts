import loglevel from "loglevel"

// Initialize loggers with default level
const loggers = {
    "default": loglevel.getLogger("default"),
    "background": loglevel.getLogger("background"),
    "session": loglevel.getLogger("session"),
    "wallet": loglevel.getLogger("wallet"),
    "wallet-modal": loglevel.getLogger("wallet-modal"),
    "wallet-send": loglevel.getLogger("wallet-send"),
    "wallet-receive": loglevel.getLogger("wallet-receive"),
    "wallet-settings": loglevel.getLogger("wallet-settings"),
    "wallet-unlock": loglevel.getLogger("wallet-unlock"),
} as const

// Set default level based on environment
const defaultLevel = import.meta.env.DEV ? "debug" : "error"

// Configure all loggers
Object.values(loggers).forEach(logger => {
    logger.setLevel(defaultLevel)
})

// Enable logging if localStorage.debug is set
if (typeof window !== 'undefined') {
    const debugEnabled = localStorage.getItem('debug')
    if (debugEnabled === 'true') {
        Object.values(loggers).forEach(logger => {
            logger.setLevel("debug")
        })
    }
}

export const log = {
    getLogger(name: keyof typeof loggers = "default") {
        return loggers[name] || loggers["default"]
    },

    // Enable debug logging
    enableDebug() {
        Object.values(loggers).forEach(logger => {
            logger.setLevel("debug")
        })
        if (typeof window !== 'undefined') {
            localStorage.setItem('debug', 'true')
        }
    },

    // Disable debug logging
    disableDebug() {
        Object.values(loggers).forEach(logger => {
            logger.setLevel(defaultLevel)
        })
        if (typeof window !== 'undefined') {
            localStorage.removeItem('debug')
        }
    }
}
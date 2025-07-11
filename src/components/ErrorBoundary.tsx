import { Component, type ErrorInfo, type ReactNode } from 'react'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("default");  

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-bold text-red-500">Something went wrong</h2>
          <p className="text-sm text-gray-500 mt-2">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
} 
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for local debugging
    console.error('[ErrorBoundary]', error, info);

    // Send to server — fire-and-forget, never throws
    try {
      fetch('/api/logs/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          url: window.location.href,
        }),
      }).catch(() => {
        // Silently ignore network errors during error reporting
      });
    } catch {
      // Never let error reporting itself crash the app
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 p-8 max-w-md">
            <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
            <p className="text-muted-foreground">
              L'application a rencontré un problème inattendu. L'équipe technique a été notifiée.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-3 py-2 text-left break-all">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: undefined });
                window.location.href = '/';
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

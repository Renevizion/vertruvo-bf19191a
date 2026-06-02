import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// List of known external errors to suppress (e.g., from Twitter browser, ad blockers)
const EXTERNAL_ERROR_PATTERNS = [
  "CONFIG",
  "Can't find variable",
  "is not defined",
  "__NEXT",
  "analytics",
  "gtag",
  "fbq",
];

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if this is an external/third-party error we should suppress
    const isExternalError = EXTERNAL_ERROR_PATTERNS.some(
      (pattern) => error.message?.includes(pattern)
    );

    if (isExternalError) {
      console.warn("Suppressed external script error:", error.message);
      return { hasError: false, error: null };
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is an external error
    const isExternalError = EXTERNAL_ERROR_PATTERNS.some(
      (pattern) => error.message?.includes(pattern)
    );

    if (!isExternalError) {
      console.error("Application error:", error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

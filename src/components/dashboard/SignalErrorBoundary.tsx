import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class SignalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("SignalErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">Something went wrong rendering this signal.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default SignalErrorBoundary;

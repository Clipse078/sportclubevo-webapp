"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  itemId: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class PlanningHubListeOperationalPanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PlanningHubListeOperationalPanel]", error, errorInfo.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.itemId !== this.props.itemId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="mt-2 rounded-lg border border-amber-300/80 bg-amber-500/10 px-3 py-2.5"
          role="alert"
          data-testid={`planning-hub-liste-operational-error-${this.props.itemId}`}
        >
          <p className="text-sm font-medium text-amber-950">Betriebsbereich konnte nicht geladen werden</p>
          <p className="mt-1 text-xs text-amber-900/90">
            Die Karte bleibt nutzbar. Details stehen in der Browser-Konsole.
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--sce-primary)] hover:underline"
            onClick={() => this.setState({ error: null })}
            data-testid={`planning-hub-liste-operational-retry-${this.props.itemId}`}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

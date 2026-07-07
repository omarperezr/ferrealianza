import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort guard: without it, any uncaught render error unmounts the whole
 * React tree and the user sees a blank page with no way to recover.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Error no capturado en la aplicación:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <p className="text-4xl">⚠️</p>
          <h1 className="text-lg font-bold text-slate-800">Algo salió mal</h1>
          <p className="text-sm text-slate-500">
            Ocurrió un error inesperado. Tu carrito y tus datos guardados no se
            pierden — recarga la página para continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full rounded-lg bg-amber-500 text-slate-900 font-semibold py-2.5 hover:bg-amber-400 transition-colors"
          >
            Recargar la página
          </button>
          <p className="text-xs text-slate-400 break-words">
            {this.state.error.message}
          </p>
        </div>
      </div>
    );
  }
}

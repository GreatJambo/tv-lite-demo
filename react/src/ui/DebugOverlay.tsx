import React from 'react';

function useQueryDebug() {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    setEnabled(/(?:^|[?&])debug=1(?:&|$)/.test(window.location.search));
  }, []);
  return enabled;
}

export const DebugOverlay: React.FC = () => {
  const enabled = useQueryDebug();
  const [lines, setLines] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!enabled) return;
    function push(msg: string) {
      setLines(prev => (prev.length > 200 ? prev.slice(-200) : prev).concat(msg));
    }
    function onError(ev: ErrorEvent) {
      push(`ERROR: ${ev.message} @ ${ev.filename}:${ev.lineno}:${ev.colno}`);
    }
    function onRej(ev: PromiseRejectionEvent) {
      push(`REJECTION: ${String(ev.reason)}`);
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRej as any);
    push('debug overlay enabled');
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRej as any);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="debug-overlay">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
};


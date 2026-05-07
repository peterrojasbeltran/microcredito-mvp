export function getMessageTone(message: string) {
  const text = (message || '').toLowerCase();
  if (!text) return 'info';
  if (
    text.includes('error') || text.includes('no se pudo') || text.includes('no puedes') ||
    text.includes('fall') || text.includes('falt') || text.includes('expirada') ||
    text.includes('mora') || text.includes('rechaz') || text.includes('bloque') ||
    text.includes('advertencia') || text.includes('supera')
  ) return 'error';
  if (text.includes('actualizando') || text.includes('cargando') || text.includes('validando') || text.includes('guardando') || text.includes('subiendo') || text.includes('registrando') || text.includes('cerrando')) return 'warning';
  if (text.includes('correctamente') || text.includes('actualizada') || text.includes('actualizado') || text.includes('registrado') || text.includes('subido') || text.includes('cerrado')) return 'success';
  return 'info';
}

type Props = {
  message?: string;
  className?: string;
};

export function StatusMessage({ message, className = '' }: Props) {
  if (!message) return null;
  const tone = getMessageTone(message);
  const styles: Record<string, string> = {
    error: 'border-red-300 bg-red-50 text-red-800 ring-red-100',
    warning: 'border-amber-300 bg-amber-50 text-amber-900 ring-amber-100',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-emerald-100',
    info: 'border-blue-300 bg-blue-50 text-blue-800 ring-blue-100',
  };
  const icons: Record<string, string> = {
    error: '⚠️',
    warning: '⏳',
    success: '✅',
    info: 'ℹ️',
  };
  return (
    <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-sm ring-1 ${styles[tone]} ${className}`} role="alert">
      <span className="mt-0.5 text-base" aria-hidden="true">{icons[tone]}</span>
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

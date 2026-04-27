export type CalendarEventStatus = 'scheduled' | 'success' | 'partial' | 'failed' | 'skipped';

// Barra colorida lateral (indicador de status no estilo ClickUp).
export const STATUS_BAR: Record<CalendarEventStatus, string> = {
  scheduled: 'bg-blue-500',
  success: 'bg-emerald-500',
  partial: 'bg-orange-500',
  failed: 'bg-red-500',
  skipped: 'bg-amber-400',
};

// Dot pequeno (legenda + lista).
export const STATUS_DOT: Record<CalendarEventStatus, string> = {
  scheduled: 'bg-blue-500',
  success: 'bg-emerald-500',
  partial: 'bg-orange-500',
  failed: 'bg-red-500',
  skipped: 'bg-amber-400',
};

export const STATUS_LABEL: Record<CalendarEventStatus, string> = {
  scheduled: 'Agendado',
  success: 'Sucesso',
  partial: 'Parcial',
  failed: 'Falhou',
  skipped: 'Pulado',
};

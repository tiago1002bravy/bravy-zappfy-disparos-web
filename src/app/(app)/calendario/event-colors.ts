export type CalendarEventStatus = 'scheduled' | 'success' | 'partial' | 'failed' | 'skipped';

export const STATUS_BG: Record<CalendarEventStatus, string> = {
  scheduled: 'bg-blue-500/90 hover:bg-blue-500 border-blue-600',
  success: 'bg-emerald-500/90 hover:bg-emerald-500 border-emerald-600',
  partial: 'bg-orange-500/90 hover:bg-orange-500 border-orange-600',
  failed: 'bg-red-500/90 hover:bg-red-500 border-red-600',
  skipped: 'bg-amber-400/90 hover:bg-amber-400 border-amber-500',
};

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

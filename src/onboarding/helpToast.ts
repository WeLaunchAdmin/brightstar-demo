/** Lightweight toast bus for help-menu confirmations. */
export function showHelpToast(message: string): void {
  window.dispatchEvent(new CustomEvent('brightstar-help-toast', { detail: message }))
}

export const HELP_TOAST_EVENT = 'brightstar-help-toast'

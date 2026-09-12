// Notification e-mail via the serverless endpoint api/notify-selection.js.
// The endpoint fixes the recipient and builds the message itself: the browser only
// sends structured facts and the selection text (attached server-side).

export interface SelectionNotification {
  galleryId: string;
  galleryName: string;
  userName: string;
  userEmail?: string;
  selectionType: 'personal' | 'complete';
  photoCount: number;
  fileName: string;
  textContent: string;
}

export interface NotifyResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const ENDPOINT = '/api/notify-selection';

async function post(payload: object): Promise<NotifyResult> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: result.error || `Erreur ${response.status}` };
    }
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Réseau indisponible' };
  }
}

export const gmailService = {
  notifySelection(notification: SelectionNotification): Promise<NotifyResult> {
    return post(notification);
  },
  sendTestEmail(): Promise<NotifyResult> {
    return post({ test: true });
  }
};

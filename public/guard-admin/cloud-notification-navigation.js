import { setupMessageUnread } from './cloud-message-unread.js';
export function setupNotificationNavigation({ messaging, navigate, getStudents }) {
  setupMessageUnread(messaging);
  let pending = null;
  const open = () => {
    if (pending === null) return;
    if (pending && !getStudents().some(student => student.id === pending)) return;
    navigate('messages'); if (pending) messaging.openStudent(pending);
    window.parent.postMessage({ type: 'bodeeguard-message-opened' }, location.origin);
    pending = null;
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'bodeeguard-open-messages') return;
    if (event.data.studentId && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(event.data.studentId)) return;
    pending = event.data.studentId || ''; open();
  });
  for (const tab of ['messages', 'settings']) {
    const heading = document.querySelector(`#tab-${tab} h1`);
    if (!heading) continue;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary';
    button.ariaLabel = 'Message notifications'; button.title = 'Message notifications';
    button.innerHTML = '<i data-lucide="bell" aria-hidden="true"></i> Message notifications';
    button.addEventListener('click', () => window.parent.postMessage({ type: 'bodeeguard-phone-notifications' }, location.origin));
    heading.after(button);
  }
  window.parent.postMessage({ type: 'bodeeguard-messages-ready' }, location.origin);
  return { update: open };
}

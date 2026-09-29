// Fixed choices keep the reaction picker small and consistent for parents and kids.
export const MESSAGE_REACTIONS = Object.freeze([
  { emoji: '👍', label: 'Thumbs up' }, { emoji: '😂', label: 'Laughing' },
  { emoji: '❤️', label: 'Love' }, { emoji: '🎉', label: 'Celebrate' },
  { emoji: '😮', label: 'Surprised' }, { emoji: '😢', label: 'Sad' }
]);
export function createMessageReactions({ onReact, otherParent = 'Parent', otherChild = 'Child' }) {
  const node = document.createElement('div'); node.className = 'message-reactions';
  const badges = document.createElement('div'); badges.className = 'message-reaction-badges';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'message-reaction-trigger';
  trigger.textContent = '☺ React'; trigger.setAttribute('aria-label', 'React to this message'); trigger.setAttribute('aria-expanded', 'false');
  const picker = document.createElement('div'); picker.className = 'message-reaction-picker'; picker.hidden = true;
  picker.setAttribute('role', 'group'); picker.setAttribute('aria-label', 'Choose a message reaction');
  const feedback = document.createElement('span'); feedback.className = 'message-reaction-feedback'; feedback.setAttribute('role', 'status'); feedback.hidden = true;
  node.append(badges, trigger, picker, feedback);
  let reactions = [], busy = false, disposed = false, key = '';
  const buttons = new Map();
  function close() { picker.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
  function controls() {
    trigger.disabled = busy;
    node.setAttribute('aria-busy', String(busy));
    node.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  }
  function update(value = []) {
    reactions = Array.isArray(value) ? value.filter(item => MESSAGE_REACTIONS.some(choice => choice.emoji === item.emoji) && Number.isInteger(item.count) && item.count > 0) : [];
    const next = JSON.stringify(reactions);
    if (next !== key) {
      key = next; badges.replaceChildren();
      for (const reaction of reactions) {
        const choice = MESSAGE_REACTIONS.find(choice => choice.emoji === reaction.emoji);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'message-reaction-badge'; button.dataset.emoji = reaction.emoji;
        button.textContent = reaction.emoji + ' ' + reaction.count;
        const people = reaction.mine && reaction.count === 1 ? ['You'] : [...(reaction.from || []).map(role => role === 'parent' ? otherParent : otherChild), reaction.mine ? 'including you' : ''].filter(Boolean);
        button.title = choice.label + ' · ' + [...new Set(people)].join(', ');
        button.setAttribute('aria-label', choice.label + ', ' + reaction.count + (reaction.mine ? ', your reaction. Remove reaction' : '. Add your reaction'));
        button.setAttribute('aria-pressed', String(Boolean(reaction.mine)));
        button.addEventListener('click', () => void react(reaction.emoji)); badges.append(button);
      }
      for (const [emoji, button] of buttons) button.setAttribute('aria-pressed', String(reactions.some(item => item.emoji === emoji && item.mine)));
    }
    controls();
  }
  async function react(emoji) {
    if (busy || disposed) return;
    const remove = reactions.some(item => item.emoji === emoji && item.mine);
    busy = true; feedback.hidden = true; controls(); close();
    try {
      const value = await onReact(remove ? null : emoji);
      if (disposed) return;
      update(value); feedback.textContent = remove ? 'Reaction removed' : 'Reaction saved';
    } catch (error) {
      if (disposed) return;
      feedback.textContent = error.message || 'Reaction could not send. Reconnect and try again.';
      feedback.hidden = false;
    } finally { busy = false; if (!disposed) controls(); }
  }
  for (const choice of MESSAGE_REACTIONS) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = choice.emoji; button.dataset.emoji = choice.emoji;
    button.setAttribute('aria-label', choice.label); button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => void react(choice.emoji)); buttons.set(choice.emoji, button); picker.append(button);
  }
  trigger.addEventListener('click', () => {
    picker.hidden = !picker.hidden; trigger.setAttribute('aria-expanded', String(!picker.hidden));
    if (!picker.hidden) picker.querySelector('button').focus();
  });
  node.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); trigger.focus(); } });
  node.addEventListener('focusout', event => { if (!node.contains(event.relatedTarget)) close(); });
  update();
  return { node, update, dispose() { disposed = true; close(); } };
}

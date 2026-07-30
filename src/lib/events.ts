type Listener = (payload: unknown) => void;

const channels = new Map<string, Set<Listener>>();

export function publish(channel: string, payload: unknown) {
  const listeners = channels.get(channel);
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribe(channel: string, listener: Listener) {
  let listeners = channels.get(channel);
  if (!listeners) {
    listeners = new Set();
    channels.set(channel, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) channels.delete(channel);
  };
}

export function wheelChannel(wheelId: string) {
  return `wheel:${wheelId}`;
}

export function displayChannel(token: string) {
  return `display:${token}`;
}

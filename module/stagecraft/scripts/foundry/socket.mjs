/**
 * The module's own socket (module.json says `"socket": true`). Foundry's server relays a module's messages straight to
 * the other clients without touching the database: the fastest path it has, and nothing is kept. The second argument
 * Foundry gives a listener is who sent it, as the server vouches for it, so a message cannot claim to be someone else's.
 */

export const CHANNEL = "module.stagecraft";

/** Listen on the channel. Returns { send, close }. */
export function openChannel(onMessage) {
  const listener = (message, sender) => onMessage(message, sender);
  game.socket.on(CHANNEL, listener);
  return {
    send: (message) => game.socket.emit(CHANNEL, message),
    close: () => game.socket.off(CHANNEL, listener)
  };
}

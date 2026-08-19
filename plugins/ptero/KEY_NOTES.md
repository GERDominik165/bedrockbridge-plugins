# Which API key does which plugin need?

This folder's `pterodactyl-bridge-bbcmd.js` talks to the **standard Pterodactyl
Client API** (`/api/client/servers/...`, power/files/backups). That requires a
real **Client API key** created in your panel under *Account → API Credentials*.

A pv-q **ServerSplitter "Node Manager" key** is scoped to the ServerSplitter
extension only and returns `401 Unauthenticated` on the standard Client API.
For those keys use the lightweight, read-only **`pvq.js`** plugin instead, which
targets `/api/client/extensions/serversplitter/api/{node}/children` and shows a
whitelisted, secret-free summary of your child servers.

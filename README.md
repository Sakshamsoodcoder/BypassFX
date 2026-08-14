# Bypass-FX

Login, signup, and a real multi-hop currency converter for **Bypass-FX**,
backed by [json-server](https://github.com/typicode/json-server) so every
account — and every conversion you run — is written to `db.json` and stays
there.

## What's inside

```
bypass-fx/
├── index.html            Log in page
├── login.html             Log in page (identical to index.html)
├── signup.html              Sign up page
├── dashboard.html             The converter — shown after login/signup
├── css/style.css                All styling (green + white theme, tokens at the top)
├── js/
│   ├── auth.js                    Talks to json-server: signup, login, session, logout
│   ├── ticker.js                    Live rate ticker on the brand panel (real data)
│   ├── converter.js                   Wires dashboard.html's form to the pathfinder
│   ├── rateService.js                   Cache-aware fetch wrapper (Frankfurter API)
│   ├── graphBuilder.js                    Pure: rates → adjacency list
│   ├── pathfinder.js                        Pure: finds the cheapest conversion path
│   └── providers.js                           Fee config + hub currency list (data only)
├── assets/logo.svg                              The Bypass-FX logo
├── db.json                                        Your database — users + conversions land here
└── package.json                                     json-server dependency + start script
```

`index.html` and `login.html` are intentionally identical — both are
complete login pages, so either URL works as an entry point.

## Run it

1. Install json-server (needs Node.js installed):
   ```bash
   cd bypass-fx
   npm install
   ```

2. Start the API. This watches `db.json` and serves it as a REST API on port 3000:
   ```bash
   npm start
   ```
   Leave this running in its own terminal.

3. Serve the frontend with a static server — **required now**, since
   `ticker.js` and `converter.js` are ES modules and browsers block
   `type="module"` scripts from loading over `file://`:
   ```bash
   npx serve .
   ```
   Open the URL it gives you (not by double-clicking `index.html`).

4. Sign up on `signup.html`. Watch `db.json` — the new user appears there
   instantly. Log back in on `login.html` (or `index.html`) with the same
   email and password to land on `dashboard.html`.

5. Run a conversion on the dashboard — e.g. INR → EUR, amount 100000. It
   fetches live rates, finds the cheapest path across Wise / PayPal / Bank
   wire, and (if you're logged in) saves the result to json-server's
   `/conversions` collection, shown under "Recent conversions" underneath.

## How the auth flow works

- **Sign up** → `GET /users?email=...` checks the email isn't already
  taken, then `POST /users` creates the record. json-server assigns the
  `id`.
- **Log in** → `GET /users?email=...&password=...`; if json-server returns
  exactly one match, you're in.
- A small session object (id, name, email, joined date — never the
  password) is kept in `localStorage` (if "Remember me" is checked) or
  `sessionStorage` otherwise, under the key `bypassfx_session`.
- `dashboard.html` has an early guard script in its `<head>` that checks
  for that session key and redirects to `login.html` before the page
  paints, so a logged-out visitor never sees the converter even briefly.
  `js/auth.js`'s own check runs after that as a second safety net, and
  populates the greeting.
- **Log out** clears the session and sends you back to `login.html`.

If `API_BASE` (top of `js/auth.js` and `js/converter.js`) doesn't match
where your json-server is running, update it in both places.

## How the converter works

- `js/providers.js` holds a small, honest mock of three real fee
  structures — there's no public API for real commercial FX fees, so this
  is hand-picked data, not live provider pricing.
- `js/rateService.js` fetches live mid-market rates from the free
  [Frankfurter API](https://api.frankfurter.app), caching each base
  currency in `localStorage` for 15 minutes so the converter and the
  ticker aren't both hammering the API independently.
- `js/graphBuilder.js` and `js/pathfinder.js` are pure functions — no DOM,
  no fetch, no localStorage — that turn rate data into a graph and search
  it for the cheapest path. Intermediate hops are restricted to a small
  set of hub currencies (USD, EUR, GBP, JPY) to keep the search fast; the
  pathfinder simulates the actual amount through each candidate path
  (rather than a classic Dijkstra) because Bank wire's fixed fee makes a
  hop's cost depend on the amount arriving at it.
- `js/converter.js` wires all of that to `dashboard.html`'s form, renders
  the result, and — if you're logged in — `POST`s it to json-server's
  `/conversions` collection and re-renders the "Recent conversions" list.

## One honest caveat

json-server has no real backend logic, so passwords are stored as plain
text in `db.json` — that's fine for learning and prototyping, but don't
ship this to real users. For production you'd want a real backend that
hashes passwords (e.g. bcrypt) before storing them and issues auth tokens
instead of trusting the client. Swapping json-server for a real API later
won't require touching the HTML/CSS or the converter logic — only the
`fetch` calls in `js/auth.js` and the two `fetch`/`saveConversion` calls in
`js/converter.js`.

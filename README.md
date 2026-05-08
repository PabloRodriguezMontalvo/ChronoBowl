# Cronómetro Blood Bowl

A simple chess-clock-style turn timer for **Blood Bowl** matches. Two named players share one device (laptop or phone), alternate turns with a single key (or tap), and pause whenever play is interrupted. Includes an optional reserve time pool that engages automatically when the per-turn timer runs out.

- 100% client-side — HTML, CSS, vanilla JavaScript
- No build step, no backend, no runtime dependencies
- Deployed as a static GitHub Pages site

> Live site: <https://pablorodriguezmontalvo.github.io/ChronoBowl/>

## How to run locally

Any static file server works. Two zero-dependency options:

### Python 3

```powershell
python -m http.server 8080
```

Open <http://localhost:8080>.

### Node.js 20+

```powershell
npx --yes http-server . -p 8080 -c-1
```

> Don't open `index.html` directly via `file://`. `localStorage` and a few CSS features behave differently under `file://`.

## Run the logic tests

The pure clock-and-transition logic has unit tests using Node 20+'s built-in test runner — no `npm install` needed:

```powershell
node --test tests
```

## Project layout

```text
/
├── index.html
├── .nojekyll
├── assets/
│   ├── css/app.css
│   ├── js/{main,state,render,input,storage}.js
│   └── vendor/{bulma.min.css, animate.min.css}
└── tests/*.test.mjs
```

See [`specs/001-bloodbowl-timer/`](specs/001-bloodbowl-timer/) for the full specification, plan, and tasks.

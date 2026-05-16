# Dincharya

Daily habit tracker: add yes/no or measurable habits, log completion by date, and see productivity, trends, activity over the year, and a monthly review—all in the browser.

- **Data** is stored **locally** in your browser (`localStorage`); there is no server or account sync.
- **Stack:** React 19, TypeScript, Vite, Recharts, date-fns, Lucide icons.

## Prerequisites

- **Node.js** 20+ recommended (includes npm).

## Setup

From the project root:

```bash
npm install
```

### Development

```bash
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)).

### Production build

```bash
npm run build
```

Output is in `dist/`. Preview it locally:

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Start dev server with HMR      |
| `npm run build`| Typecheck (`tsc`) + Vite build |
| `npm run preview` | Serve the production build  |
| `npm run lint` | Run ESLint                     |

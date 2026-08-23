<div align="center">

# Bypass-FX

### _Find the cheapest path to convert your money -- across providers, across currencies._

[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Frankfurter API](https://img.shields.io/badge/Rates-Frankfurter%20API-16A34A?style=for-the-badge)](https://api.frankfurter.app)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

**Bypass-FX** is a fintech web application designed to find the **cheapest conversion route** across multiple transfer providers (Wise, PayPal, Bank Wire) using live exchange rates and a graph-based pathfinding algorithm. Think of it as Google Maps, but for your money.

*(Note: This repository currently reflects Phase 1 / UI evaluation state. The application is fully responsive and deployed as a static site on Vercel. Complex routing JavaScript has been temporarily removed to focus on UI and static deployment workflows).*

[Getting Started](#getting-started) | [Features](#features) | [Architecture](#architecture) | [Project Structure](#project-structure)

</div>

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Running the Project](#running-the-project)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Tech Stack](#tech-stack)

---

## Features

| Feature | Description |
|---------|-------------|
| **Live Exchange Rates** | Real-time mid-market rates from the [Frankfurter API](https://api.frankfurter.app) |
| **Live Rate Ticker** | Animated marquee showing real-time currency pair movements with up/down indicators |
| **Mock Auth System** | Sign up, log in, forgot password, and session management powered entirely by the browser's `localStorage` for serverless deployment |
| **Premium UI** | Glassmorphism, fluid typography, responsive design, and dark forest green fintech aesthetic |
| **Fully Responsive** | Flexbox and CSS Grid layout seamlessly scales across desktop, tablet, and mobile breakpoints |

---

## Getting Started

### Prerequisites

You only need a **modern web browser** and a basic local HTTP server (like VS Code Live Server, or `npx serve`) to run this project locally.

### Running the Project

Because the project uses modern ES Modules (`type="module"`), you cannot simply double-click `index.html` (the browser will block the scripts due to CORS). 

**1. Serve the frontend**

```bash
npx serve .
```
*(Or use the "Go Live" button if you use the Live Server extension in VS Code).*

**2. Open your browser**
Go to `http://localhost:3000` (or whatever port your local server provides).

### Quick Walkthrough

1. **Visit the landing page** (`index.html`) -- explore the live ticker and UI mockups.
2. **Sign up** on `signup.html` -- your account is saved securely to your browser's `localStorage`.
3. **Log in** on `login.html` with your email and password.
4. **Visit your profile** -- navigate to `profile.html` to see your user stats.

---

## Architecture

The application follows a **Static Serverless Frontend** architecture, optimized for Vercel deployment:

### Layer 1 -- Frontend UI
Six HTML pages handle all user interactions:

| Page | Purpose |
|------|---------|
| `index.html` | Marketing landing page with live ticker & UI converter mockup |
| `login.html` | Login page with brand storytelling + auth form |
| `signup.html` | Registration with client-side validation |
| `forgot-password.html` | Multi-step password reset (email verify -> new password) |
| `rates.html` | Live rate charts and historical timeseries |
| `profile.html` | Authenticated user profile and session dashboard |

### Layer 2 -- JavaScript Logic
Modular JS files power the static logic:

| Module | Responsibility |
|--------|----------------|
| `auth.js` | Login, signup, forgot password, sessions, and `localStorage` mock database |
| `ticker.js` | Live animated rate ticker |
| `rateService.js` | Frankfurter API client for live market rates |
| `home.js` | Landing page layout interactions (mobile nav, etc) |

### Layer 3 -- External APIs
- **Frankfurter API:** Free, public API providing live mid-market exchange rates (`https://api.frankfurter.app`).

---

## Project Structure

```
Bypass-FX/
|
|-- index.html                 # Landing page
|-- login.html                 # Login page
|-- signup.html                # Sign up page
|-- forgot-password.html       # Password reset
|-- rates.html                 # Live Market Rates studio
|-- profile.html               # Auth'd user profile
|
|-- js/
|   |-- auth.js                # Authentication & session management (Local Storage)
|   |-- ticker.js              # Live rate ticker animation
|   |-- rateService.js         # Frankfurter API client
|   |-- home.js                # Layout controller (standalone)
|
|-- css/
|   |-- style.css              # Auth pages + base styles
|   |-- home.css               # Landing page design system
|   |-- rates.css              # Rates page design system
|   |-- profile.css            # Profile page design system
|
|-- assets/
|   |-- logo.svg               # Brand icon
|
|-- README.md                  # You are here!
```

---

## Authentication Flow

To allow seamless hosting on Vercel without requiring a dedicated Node.js backend, authentication is fully mocked using the browser's native `localStorage`.

- **Storage Key:** `bypassfx_users_db` (Array of users)
- **Session Key:** `bypassfx_session` (Currently logged-in user object)
- **Security Note:** Passwords are saved in plain text in `localStorage`. This is strictly for demonstration and UI evaluation purposes. A production application would require a real backend (like Firebase or Supabase) with hashed passwords.

---

## API Endpoints

**External Data API:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `https://api.frankfurter.app/latest?from=BASE` | Fetch live exchange rates for a base currency |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML5, CSS3, ES Modules -- zero frameworks |
| **Styling** | Custom design system with CSS Grid/Flexbox, glassmorphism, `clamp()` typography |
| **Backend** | Serverless / LocalStorage (Vercel deployment compatible) |
| **Live Rates** | [Frankfurter API](https://api.frankfurter.app) |
| **Fonts** | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (display), [Inter](https://fonts.google.com/specimen/Inter) (body) |

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built by Saksham Sood, Kartik Verma, and Kartik Sharma**

_If you found this useful, consider giving it a star!_

</div>

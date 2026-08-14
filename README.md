# BypassFX

This project demonstrates a client-side authentication flow (signup, login, logout) for a web application, styled with a modern and responsive design. It uses a simple `json-server` as a mock backend for user data.

## Features

-   **User Authentication**:
    -   Signup with name, email, password, and terms agreement.
    -   Login with email and password, including a "Remember Me" option.
    -   Logout functionality.
-   **Form Validation**: Client-side validation for signup and login forms.
-   **Session Management**: Stores user session in `localStorage` or `sessionStorage`.
-   **Password Visibility Toggle**: Allows users to show/hide password input.
-   **Dynamic UI Feedback**:
    -   Error messages for invalid input.
    -   Success/error/info banners for user feedback.
    -   Busy states for submit buttons during API calls.
-   **Responsive Design**: Adapts to different screen sizes.
-   **Themed UI**: Utilizes CSS variables for consistent styling.
-   **Dashboard**: A simple dashboard page accessible after successful login, displaying user information.

## Setup

This project requires a mock API server to run. It's configured to work with `json-server`.

1.  **Install `json-server` (if you haven't already):**
    ```bash
    npm install -g json-server
    ```

2.  **Create a `db.json` file** in the root of your project with the following content:
    ```json
    {
      "users": []
    }
    ```

3.  **Start the `json-server`:**
    ```bash
    json-server --watch db.json --port 3000
    ```
    The `auth.js` script expects the API to be running at `http://localhost:3000`.

4.  **Open `index.html`** (or `login.html`/`signup.html`) in your web browser.

## Code Overview

### `js/auth.js`

This JavaScript file handles all client-side authentication logic and interactions.

-   **Configuration**: Defines `API_BASE` for the backend endpoint and `SESSION_KEY` for session storage.
-   **Utility Functions**:
    -   `$`: A shorthand for `document.getElementById`.
    -   `setError`, `clearErrors`: Manages form field error messages and styling.
    -   `showBanner`, `hideBanner`: Displays various types of feedback banners (success, error, info).
    -   `setBusy`: Manages button states (disabled, text change) during asynchronous operations.
    -   `saveSession`, `readSession`, `clearSession`: Handles user session persistence in `localStorage` or `sessionStorage`.
    -   `friendlyNetworkError`: Provides a user-friendly message for network issues.
-   **Password Visibility Toggle**: Implements functionality for eye icons to show/hide password input fields.
-   **Signup Logic**:
    -   Listens for `submit` events on the signup form.
    -   Performs client-side validation for name, email, password length, password confirmation, and terms agreement.
    -   Checks for existing users via API call.
    -   Registers new users by sending a `POST` request to the API.
    -   Saves the session and redirects to `dashboard.html` on success.
    -   **Note**: Passwords are sent in plain text for this demo. In a production environment, passwords should always be hashed on the client-side before sending to the server, and the server should store only hashed passwords.
-   **Login Logic**:
    -   Listens for `submit` events on the login form.
    -   Performs client-side validation for email and password presence.
    -   Authenticates users by querying the API for matching email and password.
    -   Saves the session and redirects to `dashboard.html` on success.
    -   Includes a placeholder for a "Forgot Password" link.
-   **Dashboard Logic**:
    -   Checks for an active session on `dashboard.html`. If no session, redirects to `index.html`.
    -   Displays user details (name, email, ID, join date) on the dashboard.
    -   Handles logout, clearing the session and redirecting to `index.html`.

### `css/style.css`

This CSS file defines the visual styling for the entire application, using a design token approach.

-   **Design Tokens (`:root`)**:
    -   Defines custom properties for colors (`--bg-canvas`, `--surface`, `--accent`, `--danger`, etc.), typography (`--font-display`, `--font-body`, `--font-mono`), and shape (`--radius-lg`, `--shadow-panel`).
-   **Global Styles**: Resets basic browser styles, sets default font, background, and text colors. Uses `flexbox` to center content on the page.
-   **Shell Layout (`.shell`)**: Defines the main container layout, using `grid` for the two-panel structure (brand/story and auth form).
-   **Left Panel (`.panel-brand`)**: Styles the branding and informational section, including:
    -   Gradient background.
    -   Brand mark (logo + name).
    -   Headline and introductory text.
    -   Feature list with SVG icons.
    -   **Ticker Animation**: A continuously scrolling "live rate strip" (`.ticker`, `.ticker-track`, `.tick`) to add a dynamic element, with a `prefers-reduced-motion` media query for accessibility.
-   **Right Panel (`.panel-form`)**: Styles the authentication forms, including:
    -   **Tabs (`.tabs`)**: For switching between login/signup.
    -   Form headings and descriptions.
    -   **Form Fields (`.field`, `.field-input`)**: Styles for labels, text inputs, and password inputs. Includes focus and invalid states.
    -   **Toggle Visibility Button (`.toggle-visibility`)**: Styles for the password show/hide button, including SVG icons.
    -   **Error Messages (`.field-error`)**: Styles for displaying validation errors.
    -   **Checkboxes and Links (`.checkbox-row`, `.link-quiet`)**: Specific styles for interactive elements.
    -   **Primary Button (`.btn-primary`)**: Styles for submit buttons, including hover, active, and disabled states.
    -   **Divider (`.divider`)**: A styled "or" separator.
    -   **Secondary Button (`.btn-secondary`)**: Styles for alternative actions (e.g., social login placeholders).
    -   **Banners (`.banner`)**: Styles for success, error, and info messages, with `display: none` by default and `display: flex` when `.show`.
-   **Responsive Design (`@media`)**: Adjusts the layout for smaller screens, collapsing the two-panel grid into a single column and hiding some elements like the feature list on mobile.
-   **Dashboard Styles (`.dash-shell`, `.dash-top`, `.dash-card`, `.kv`)**: Specific styles for the post-login dashboard, including a header, a ghost button for logout, and a key-value display for user details.
# Arex - Personal AI Assistant

Frontend-only web application with production-ready architecture.

## Tech Stack

- React 18
- Tailwind CSS (via CDN)
- Vite
- Single-page app (no routing)

## Setup

```bash
npm install
npm run dev
```

## Architecture

### Components

- **App.jsx** - Global state (mode, theme)
- **TopNav.jsx** - Navigation with mode toggle
- **ChatView.jsx** - Arex chat interface
- **CreateAgentView.jsx** - Agent creation flow
- **ProcessingSteps.jsx** - Step-by-step processing UI
- **SettingsView.jsx** - Theme and settings

### Modes

1. **Arex** - Personal AI chat with mocked responses
2. **Create Agent** - Document upload → processing → chat
3. **Settings** - Theme toggle and info

### Design System

- Primary Blue: #1A73E8
- Deep Navy: #0B2E4E
- Soft Teal: #4FD1C5
- Light/Dark mode support

## Backend Integration

All components use internal state. To connect to backend:

1. Replace mocked responses in ChatView with API calls
2. Replace setTimeout in ProcessingSteps with real processing endpoints
3. Add file upload logic in CreateAgentView
4. Add authentication wrapper around App

No architectural changes needed.

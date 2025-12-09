# LLM Log

A personal logging application for LLM conversations, built with Next.js.

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sweon/llm_log.git
   cd llm_log
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the Application

#### Development Mode
To run the application in development mode with hot-reloading:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to use the app.

#### Production Build (Static Export)
To build the application as a static site (which can be run without a Node.js server):

1. **Build the project:**
   ```bash
   npm run build
   ```
   This will generate a static version of the app in the `out/` directory.

2. **Run the static build:**
   You can serve the `out/` directory with any static file server. For example, using Python:
   ```bash
   cd out
   python3 -m http.server 8080
   ```
   Then open [http://localhost:8080](http://localhost:8080) in your browser.

## Features
- **Create Logs**: Store your LLM conversations.
- **Markdown Support**: Full Markdown rendering with syntax highlighting and math support (KaTeX).
- **Static Export**: Can be deployed as a static site.
- **PWA Support**: Installable as a Progressive Web App.

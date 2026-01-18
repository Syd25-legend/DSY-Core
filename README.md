# DSY Core

> 🚀 AI-Powered Web Development Platform — Generate pixel-perfect HTML & CSS from prompts and images

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-7.2-646cff.svg)

## ✨ Features

### 🤖 AI-Powered Code Generation

- **Dual AI Pipeline** — Uses Gemini 2.5 Flash for both prompt optimization and code generation
- **Image-to-Code** — Upload design mockups and convert them to working HTML/CSS
- **Smart Prompt Optimization** — AI analyzes your prompt and extracts design specifications as structured JSON
- **Multi-Key Rotation** — Supports up to 12 API keys with automatic failover on rate limits

### 💻 VS Code-Style Editor

- **Monaco Editor Integration** — Full-featured code editor with syntax highlighting
- **Multi-File Support** — Work with HTML, CSS, and JavaScript files simultaneously
- **File Explorer Panel** — Navigate your project with a familiar tree structure
- **Tabbed Interface** — Open multiple files with easy tab switching

### 🎨 Design Features

- **Live Preview** — See your changes in real-time as you code
- **Glassmorphism Effects** — Modern UI with frosted glass aesthetics
- **Dark Theme** — Luxurious dark theme with gold accents
- **Responsive Design** — Generated code is mobile-friendly

### 📦 Asset Management

- **Drag & Drop Upload** — Simply drag images into the workspace
- **Clipboard Paste** — Paste images directly from your clipboard (Ctrl+V)
- **External Links** — Add reference URLs for AI context
- **Project Download** — Export your project as a ZIP file

### 🔧 Additional Features

- **Session Persistence** — Unique session IDs stored in IndexedDB
- **Chat History** — Track your AI conversation history
- **API Key Debugger** — Test individual API keys for troubleshooting
- **Box Model Inspector** — Inspect CSS box model properties

---

## 🛠 Tech Stack

| Category        | Technology              |
| --------------- | ----------------------- |
| **Frontend**    | React 19.2              |
| **Build Tool**  | Vite 7.2                |
| **Styling**     | Tailwind CSS 4.1        |
| **Code Editor** | Monaco Editor           |
| **AI Provider** | Google Gemini 2.5 Flash |
| **Storage**     | IndexedDB (via idb)     |
| **Icons**       | Lucide React            |
| **Bundling**    | JSZip + FileSaver       |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Syd25-legend/DSY-Core.git
cd DSY-Core

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configuration

Create a `.env` file with your API keys:

```env
# Gemini API Configuration
# Get your API keys from https://aistudio.google.com/app/apikey
# Add multiple keys as comma-separated values for key rotation
VITE_GEMINI_API_KEYS=key1,key2,key3

# Optional: SambaNova API (for alternative AI provider)
VITE_SAMBANOVA_API_KEY=your_sambanova_key
VITE_SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1

# Optional: Groq API
VITE_GROQ_API_KEY=your_groq_key
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

```
DSY-Core/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── CodeEditor.jsx       # Monaco-based editor
│   │   ├── LivePreview.jsx      # Real-time preview
│   │   ├── AssetPreview.jsx     # Asset management
│   │   ├── ChatHistoryDrawer.jsx
│   │   └── ...
│   ├── context/         # React context providers
│   │   └── CodeContext.jsx      # Global code state
│   ├── services/        # API integrations
│   │   ├── geminiService.js     # Gemini AI integration
│   │   └── sambaNovaService.js  # SambaNova integration
│   ├── utils/           # Utility functions
│   │   ├── storage.js           # IndexedDB helpers
│   │   └── imageUtils.js        # Image processing
│   ├── App.jsx          # Main application
│   └── index.css        # Global styles
├── .env.example         # Environment template
├── vite.config.js       # Vite configuration
└── package.json
```

---

## 🎯 Usage

1. **Enter a Prompt** — Describe the website you want to create
2. **Add Assets** (Optional) — Upload design mockups or reference images
3. **Optimize** — Click "Optimize" to enhance your prompt with AI
4. **Generate** — Click "Send" to generate the HTML/CSS code
5. **Edit** — Use the Monaco editor to refine the generated code
6. **Preview** — See your creation in the live preview panel
7. **Download** — Export your project as a ZIP file

---

## 🔑 API Key Setup

DSY Core uses Google Gemini API for AI features. To get started:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create one or more API keys
3. Add them to your `.env` file as comma-separated values
4. The system automatically rotates between keys to avoid rate limits

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

<p align="center">
  Made with ❤️ by <strong>DSY Core Team</strong>
</p>

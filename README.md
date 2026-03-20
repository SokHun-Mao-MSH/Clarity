# 🏢 Enterprise Builder AI

Enterprise Builder AI is the world's most advanced AI-driven system for generating production-ready software architectures. Built with a stunning modern React UI, beautiful subtle animations, and powered by the Gemini AI Engine.

## ✨ Features

- **Gemini AI Core**: Analyze requirements and generate complete full-stack blueprints ranging from simple APIs to Enterprise SaaS.
- **Dynamic 3D Environment**: Immersive, hardware-accelerated particle network background (via `tsparticles`) that reacts to light/dark themes.
- **Scramble & Shimmer Animations**: Highly polished typographic animations including continuous gradient shimmers and interactive alphabet-scramble hover effects on the logo.
- **Real-time Code Preview**: Browse generated code through a built-in, multi-tabbed code editor interface.
- **Interactive Workbench**: Download output, copy code, generate security audits, and feasibility checks instantly.
- **Google Authentication**: Built-in backend integration via Firebase for saving generated projects and managing accounts.

## 🚀 Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Setup Environment Variables**
   Duplicate `.env.example` to `.env` and fill in your Gemini and Firebase API keys.
3. **Run the local server**
   ```bash
   npm run dev
   ```

## ☁️ Deploying to Firebase Hosting

This application is fully tuned and ready to be deployed globally via Firebase Hosting. 

**Prerequisites:** You must have the Firebase CLI installed (`npm install -g firebase-tools`) and be logged in (`firebase login`).

### Step 1: Build the Application
Before deploying, compile the React application into a highly optimized production bundle:
```bash
npm run build
```
*(This will generate a `dist` folder containing the final HTML, CSS, and JS).*

### Step 2: Deploy to the Internet
Since `firebase.json` and `.firebaserc` are already configured for this project, simply run:
```bash
firebase deploy --only hosting
```

Your terminal will provide you with a live URL (e.g., `https://your-project.web.app`) where you can view your deployed application!

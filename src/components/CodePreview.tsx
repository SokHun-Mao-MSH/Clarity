import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Code2, 
  AlertCircle,
} from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SandpackProvider, 
  SandpackLayout, 
  SandpackCodeEditor, 
  SandpackPreview, 
  SandpackFileExplorer,
  SandpackTheme,
  SandpackFiles,
  useSandpack
} from "@codesandbox/sandpack-react";

interface FileItem {
  path: string;
  name: string;
  content: string;
  language: string;
}

interface CodePreviewProps {
  content: string;
  darkMode: boolean;
  onUpdate?: (newContent: string) => void;
  viewMode?: ViewMode;
}

type ViewMode = 'preview' | 'code';

export const CodePreview: React.FC<CodePreviewProps> = ({ content, darkMode, onUpdate, viewMode: externalViewMode }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(externalViewMode || 'code');
  const [sandpackFiles, setSandpackFiles] = useState<SandpackFiles>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const lastSyncedContentRef = useRef<string>('');

  useEffect(() => {
    if (externalViewMode) {
      setViewMode(externalViewMode);
    }
  }, [externalViewMode]);

  // Parse content into files for Sandpack
  useEffect(() => {
    // If the content is the same as what we just synced out, don't re-parse
    // This prevents infinite loops and editor resets
    if (content === lastSyncedContentRef.current) {
      return;
    }

    try {
      const parsed = JSON.parse(content);
      const spFiles: SandpackFiles = {};

      if (parsed.overview) {
        spFiles['/BLUEPRINT.md'] = { code: parsed.overview };
      }

      if (Array.isArray(parsed.files)) {
        parsed.files.forEach((file: any) => {
          // Sandpack expects paths to start with /
          let sandpackPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
          
          // Normalize paths: if it's a React component or CSS and not in src/, move it to src/
          // BUT only if it's not already in src/ and not a root config file
          const isReactFile = sandpackPath.endsWith('.tsx') || sandpackPath.endsWith('.jsx') || sandpackPath.endsWith('.js');
          const isCssFile = sandpackPath.endsWith('.css');
          const isRootConfig = sandpackPath === '/package.json' || sandpackPath === '/tsconfig.json' || sandpackPath === '/tailwind.config.js';
          
          if ((isReactFile || isCssFile) && !sandpackPath.startsWith('/src/') && !isRootConfig) {
            sandpackPath = `/src${sandpackPath}`;
          }
          
          spFiles[sandpackPath] = { code: file.content };
        });
      }

      // Ensure essential files for react-ts template if missing
      if (!spFiles['/package.json']) {
        spFiles['/package.json'] = {
          code: JSON.stringify({
            dependencies: {
              "react": "^18.0.0",
              "react-dom": "^18.0.0",
              "react-router-dom": "^6.0.0",
              "lucide-react": "latest",
              "framer-motion": "latest",
              "clsx": "latest",
              "tailwind-merge": "latest"
            }
          }, null, 2)
        };
      }

      if (!spFiles['/public/index.html']) {
        spFiles['/public/index.html'] = {
          code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Enterprise Preview</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
        };
      }

      if (!spFiles['/src/App.tsx']) {
        // If App.tsx is missing, try to find any tsx file to use as App.tsx or create a dummy
        const anyTsx = Object.keys(spFiles).find(p => p.endsWith('.tsx') && p !== '/src/index.tsx');
        if (anyTsx) {
          // Rename it to App.tsx if it's the only one
          spFiles['/src/App.tsx'] = spFiles[anyTsx];
          if (anyTsx !== '/src/App.tsx') delete spFiles[anyTsx];
        } else {
          spFiles['/src/App.tsx'] = { code: 'export default function App() { return <div className="p-8">App Component</div>; }' };
        }
      }

      if (!spFiles['/src/index.css']) {
        spFiles['/src/index.css'] = {
          code: `/* Global Styles */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`
        };
      }

      if (!spFiles['/src/index.tsx']) {
        spFiles['/src/index.tsx'] = {
          code: `import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);`
        };
      }

      // If no files were found, maybe it's legacy format
      if (Object.keys(spFiles).length === 0) {
        throw new Error("No files found in JSON");
      }

      setSandpackFiles(spFiles);
      setParseError(null);
      lastSyncedContentRef.current = content;
    } catch (e) {
      // Fallback to legacy parsing if not JSON or invalid JSON
      const spFiles: SandpackFiles = {};
      
      const firstFileHeaderIndex = content.indexOf('### `');
      const blueprintContent = firstFileHeaderIndex !== -1 
        ? content.substring(0, firstFileHeaderIndex).trim() 
        : content;

      if (blueprintContent) {
        spFiles['/BLUEPRINT.md'] = { code: blueprintContent };
      }

      const codeBlockRegex = /(?:###\s+`([^`]+)`|\*\*(.+?)\*\*)\s*\n\s*```(\w+)?\n([\s\S]*?)```/g;
      let match;
      while ((match = codeBlockRegex.exec(content)) !== null) {
        const path = (match[1] || match[2]).trim();
        const sandpackPath = path.startsWith('/') ? path : `/${path}`;
        spFiles[sandpackPath] = { code: match[4].trim() };
      }

      if (Object.keys(spFiles).length <= 1) {
        const simpleRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let i = 1;
        while ((match = simpleRegex.exec(content)) !== null) {
          const lang = match[1] || 'text';
          const code = match[2].trim();
          const firstLine = code.split('\n')[0];
          const nameMatch = firstLine.match(/(?:\/\/|#)\s*([\w\.\-\/]+)/);
          const name = nameMatch ? nameMatch[1] : `block-${i++}.${lang === 'typescript' || lang === 'tsx' ? 'tsx' : lang === 'javascript' ? 'js' : 'txt'}`;
          const sandpackPath = name.startsWith('/') ? name : `/${name}`;
          
          spFiles[sandpackPath] = { code };
        }
      }

      setSandpackFiles(spFiles);
      setParseError('Content is not a valid JSON project blueprint. Falling back to legacy parsing.');
      lastSyncedContentRef.current = content;
    }
  }, [content]);

  const sandpackTheme = (darkMode ? 'dark' : 'light') as any;

  const SandpackSync = () => {
    const { sandpack } = useSandpack();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
      if (onUpdate) {
        // Debounce updates to App.tsx
        if (timerRef.current) clearTimeout(timerRef.current);
        
        timerRef.current = setTimeout(() => {
          const currentFiles = sandpack.files;
          const fileList: any[] = [];
          let overview = '';
          
          Object.entries(currentFiles).forEach(([path, file]) => {
            const cleanPath = path.startsWith('/') ? path.substring(1) : path;
            if (cleanPath === 'BLUEPRINT.md') {
              overview = file.code;
            } else {
              fileList.push({
                path: cleanPath,
                content: file.code,
                language: cleanPath.split('.').pop() || 'text'
              });
            }
          });

          const jsonOutput = {
            overview,
            files: fileList
          };

          const newContent = JSON.stringify(jsonOutput, null, 2);
          if (newContent !== lastSyncedContentRef.current) {
            lastSyncedContentRef.current = newContent;
            onUpdate(newContent);
          }
        }, 1000); // 1 second debounce
      }

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [sandpack.files, onUpdate]);

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-200 dark:border-white/5 overflow-hidden shadow-2xl">
      {/* Top Header */}
      <div className="px-8 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-black/20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-200/50 dark:bg-zinc-900/80 p-1 rounded-xl border border-zinc-300/50 dark:border-white/5">
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'preview' 
                  ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Play className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'code' 
                  ? "bg-white dark:bg-zinc-800 text-emerald-500 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              Code
            </button>
          </div>
          
          <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 mx-2" />
          
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Live Sync
          </div>
        </div>

        <div className="flex items-center gap-3">
          {parseError && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              Legacy Mode
            </div>
          )}
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
            Enterprise
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <SandpackProvider
          files={sandpackFiles}
          theme={sandpackTheme}
          template="react-ts"
          options={{
            recompileMode: "immediate",
            recompileDelay: 300,
          }}
        >
          <SandpackSync />
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <SandpackLayout className="h-full border-none rounded-none bg-transparent">
                {viewMode === 'code' ? (
                  <>
                    <SandpackFileExplorer className="h-full border-r border-zinc-100 dark:border-white/5 bg-zinc-50/30 dark:bg-black/10" />
                    <SandpackCodeEditor 
                      showTabs 
                      showLineNumbers 
                      showInlineErrors 
                      closableTabs
                      className="h-full flex-1"
                    />
                  </>
                ) : (
                  <SandpackPreview 
                    showNavigator 
                    showRefreshButton 
                    className="h-full flex-1 bg-white dark:bg-zinc-950"
                  />
                )}
              </SandpackLayout>
            </motion.div>
          </AnimatePresence>
        </SandpackProvider>
      </div>
    </div>
  );
};

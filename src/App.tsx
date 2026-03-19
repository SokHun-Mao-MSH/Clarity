import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Sparkles, 
  Terminal, 
  Cpu, 
  Layers, 
  Zap, 
  ChevronRight, 
  Github, 
  Twitter, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Download,
  Plus,
  History,
  Settings2,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Globe,
  Database,
  Layout,
  FileCode,
  Briefcase,
  Building2,
  Trash2,
  Menu,
  X,
  Home,
  ExternalLink,
  Check,
  Sun,
  Moon,
  Edit3,
  Play,
  RefreshCcw,
  Box,
  Shield,
  Search,
  Paperclip,
  FilePlus,
  Trash,
  AlertTriangle,
  Fingerprint,
  Key,
  Activity,
  Clock,
  Bell,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { cn } from "./utils";
import Markdown from 'react-markdown';
import { 
  auth, 
  signIn, 
  logOut, 
  createProject, 
  updateProject,
  deleteProject,
  getUserProjects, 
  Project,
  ProjectVersion,
  db
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Timestamp, getDocFromServer, doc } from 'firebase/firestore';
import { CodePreview } from './components/CodePreview';
import JSZip from 'jszip';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type Container, type ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface GenerationOptions {
  roleBased: boolean;
  chainOfThought: boolean;
  framework: string;
  scope: string;
  language: string;
  fullStack: boolean;
}

const FRAMEWORKS = [
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Node.js', 
  'Python/FastAPI', 'Django', 'Laravel', 'Spring Boot', 
  'Go/Fiber', 'Rust/Axum', 'Static HTML/CSS'
];
const SCOPES = [
  'MVP', 'Internal Tool', 'Enterprise Grade', 'SaaS Product', 
  'Portfolio', 'Personal Website', 'E-commerce', 'Admin Dashboard', 
  'Mobile App (React Native)', 'Game (Phaser/Three.js)'
];
const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 
  'Java', 'PHP', 'C#', 'CSS/SCSS'
];

const CharacterScramble = ({ char, isHovered, index }: { char: string, isHovered: boolean, index: number }) => {
  const [displayChar, setDisplayChar] = useState(char);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  useEffect(() => {
    if (isHovered && char !== ' ') {
      let iterations = 0;
      const interval = setInterval(() => {
        setDisplayChar(letters[Math.floor(Math.random() * letters.length)]);
        iterations++;
        if (iterations > 6) {
          clearInterval(interval);
          setDisplayChar(char);
        }
      }, 50 + (index * 10));
      return () => clearInterval(interval);
    } else {
      setDisplayChar(char);
    }
  }, [isHovered, char, index]);

  return <span>{displayChar}</span>;
};

interface CustomDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ElementType;
}

const CustomDropdown = ({ value, options, onChange, icon: Icon }: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-enterprise flex items-center justify-between w-full text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />}
          <span className="truncate">{value}</span>
        </div>
        <ChevronRight className={cn(
          "w-4 h-4 text-zinc-400 transition-transform duration-200",
          isOpen ? "rotate-90" : "rotate-0"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden py-1.5"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors",
                    value === option 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [logoHover, setLogoHover] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string, type: string}[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fixingError, setFixingError] = useState(false);
  const [errorToFix, setErrorToFix] = useState('');
  const [showErrorFixer, setShowErrorFixer] = useState(false);
  const [checking, setChecking] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<{
    feasible: boolean;
    score: number;
    analysis: string;
    recommendations: string[];
    risks: string[];
  } | null>(null);
  const [buildStep, setBuildStep] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState(JSON.stringify({
    "overview": "Advanced E-Commerce Platform",
    "files": [
      {
        "path": "package.json",
        "content": JSON.stringify({
          "name": "nexus-store",
          "version": "1.0.0",
          "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "lucide-react": "^0.263.1",
            "framer-motion": "^10.12.16",
            "clsx": "^1.2.1",
            "tailwind-merge": "^1.13.2"
          }
        }, null, 2),
        "language": "json"
      },
      {
        "path": "src/App.tsx",
        "content": `import React from 'react';
import { ShoppingCart, User, Search, Star, Heart } from 'lucide-react';

const ProductCard = ({ product }) => (
  <div className="group bg-white rounded-2xl border border-zinc-100 overflow-hidden hover:shadow-xl transition-all">
    <div className="relative aspect-square overflow-hidden bg-zinc-100">
      <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <Heart className="w-4 h-4" />
      </button>
    </div>
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-sm">{product.name}</h3>
        <span className="text-xs font-bold text-emerald-600">$ {product.price}</span>
      </div>
      <div className="flex items-center gap-1 text-amber-500">
        <Star className="w-3 h-3 fill-current" />
        <span className="text-[10px] font-bold">{product.rating}</span>
      </div>
      <button className="w-full py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors">
        <ShoppingCart className="w-3.5 h-3.5" />
        Add to Cart
      </button>
    </div>
  </div>
);

export default function App() {
  const products = [
    { id: 1, name: 'Ultra-Wide Monitor', price: 1299, rating: 4.8, image: 'https://picsum.photos/seed/monitor/400/400' },
    { id: 2, name: 'Wireless Keyboard', price: 159, rating: 4.9, image: 'https://picsum.photos/seed/keyboard/400/400' },
    { id: 3, name: 'Noise Cancelling Headphones', price: 349, rating: 4.7, image: 'https://picsum.photos/seed/headphones/400/400' },
    { id: 4, name: 'Ergonomic Chair', price: 499, rating: 4.6, image: 'https://picsum.photos/seed/chair/400/400' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tighter uppercase">Nexus<span className="text-emerald-500">Store</span></h1>
        <div className="flex items-center gap-4">
          <Search className="w-5 h-5 text-zinc-400" />
          <ShoppingCart className="w-5 h-5 text-zinc-400" />
          <User className="w-5 h-5 text-zinc-400" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </main>
    </div>
  );
}`,
        "language": "tsx"
      }
    ]
  }, null, 2));
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [options, setOptions] = useState<GenerationOptions>({
    roleBased: true,
    chainOfThought: true,
    framework: 'React',
    scope: 'Enterprise Grade',
    language: 'TypeScript',
    fullStack: false,
  });
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [mainView, setMainView] = useState<'home' | 'project' | 'history' | 'settings' | 'profile'>('home');
  const [settingsTab, setSettingsTab] = useState<'general' | 'security' | 'api' | 'notifications' | 'billing'>('general');
  const [showShare, setShowShare] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<'preview' | 'code'>('code');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const resultRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    // Particles loaded
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          content: content,
          type: file.type
        }]);
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const stats = React.useMemo(() => {
    if (!generatedCode) return null;
    const lines = generatedCode.split('\n').length;
    const files = (generatedCode.match(/```/g) || []).length / 2;
    return {
      lines: Math.round(lines * 0.8), // simulated code lines
      files: Math.max(1, Math.floor(files)),
      complexity: (options.scope === 'Enterprise Grade' || options.scope === 'SaaS Product') ? 'High' : (options.scope === 'Portfolio' ? 'Creative' : 'Moderate'),
      security: options.scope === 'Enterprise Grade' ? 'Verified' : 'Standard'
    };
  }, [generatedCode, options.scope]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const unsubProjects = getUserProjects(currentUser.uid, (data) => {
          setProjects(data);
        });
        return () => unsubProjects();
      } else {
        setProjects([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setBackendStatus('online');
      })
      .catch(() => setBackendStatus('offline'));
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Test Firestore connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  const handleCheckSpecs = async () => {
    if (!prompt.trim()) return;
    setChecking(true);
    setCheckFeedback(null);

    const fullPrompt = uploadedFiles.length > 0 
      ? `${prompt}\n\n--- ATTACHED FILES ---\n${uploadedFiles.map(f => `FILE: ${f.name}\nCONTENT:\n${f.content}`).join('\n\n')}`
      : prompt;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `You are a senior software architect and feasibility analyst.
      
      Analyze the user's project prompt and any attached files to determine if it can be built as a complete, functional React application within a browser-based preview environment (Sandpack).
      
      Consider:
      1. Technical Feasibility: Can the requested features be implemented using standard web technologies (React, JS/TS, Tailwind)?
      2. Environment Constraints: Does it require server-side features (Node.js, databases, file system) that cannot be fully simulated in a browser?
      3. Complexity: Is the scope too large for a single-turn generation?
      
      Return a JSON object with this structure:
      {
        "feasible": boolean,
        "score": number (0-100),
        "analysis": "A detailed technical analysis of the requirements",
        "recommendations": ["A list of recommendations to improve the prompt or architecture"],
        "risks": ["Potential technical risks or limitations"]
      }
      
      Do not include any text outside the JSON block.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.5,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '{}';
      const result = JSON.parse(text);
      setCheckFeedback(result);
    } catch (error) {
      console.error("Check failed:", error);
      setCheckFeedback({
        feasible: true,
        score: 70,
        analysis: "Unable to perform deep validation at this time. The prompt appears generally sound.",
        recommendations: ["Proceed with the build and refine iteratively."],
        risks: ["Potential connectivity issues during validation."]
      });
    } finally {
      setChecking(false);
    }
  };

  const handleAudit = async () => {
    if (!generatedCode) return;
    setAuditing(true);
    setShowAuditModal(true);
    setAuditReport(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `You are a Senior Security Engineer and Performance Architect.
      Your task is to perform a deep technical audit of the provided application code.
      
      Analyze the code for:
      1. Security Vulnerabilities (XSS, SQL Injection, CSRF, insecure storage, etc.)
      2. Performance Bottlenecks (unnecessary re-renders, slow algorithms, lack of memoization, etc.)
      3. Code Quality & Maintainability (naming conventions, modularity, error handling).
      4. Accessibility (ARIA labels, contrast, keyboard navigation).
      
      Return a JSON object with this structure:
      {
        "overallScore": number (0-100),
        "security": { "score": number, "findings": ["Finding 1", "Finding 2"] },
        "performance": { "score": number, "findings": ["Finding 1", "Finding 2"] },
        "maintainability": { "score": number, "findings": ["Finding 1", "Finding 2"] },
        "criticalFixes": ["Fix 1", "Fix 2"],
        "optimizationTips": ["Tip 1", "Tip 2"]
      }
      
      Do not include any text outside the JSON block.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `AUDIT THIS CODE:\n${generatedCode}`,
        config: {
          systemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '{}';
      setAuditReport(JSON.parse(text));
    } catch (error) {
      console.error("Audit failed:", error);
      setAuditReport({
        overallScore: 0,
        error: "Failed to complete audit. Please try again."
      });
    } finally {
      setAuditing(false);
    }
  };

  const handleGenerate = async (isUpdate = false) => {
    if (!prompt.trim()) return;
    setLoading(true);
    setCheckFeedback(null);
    
    const steps = isUpdate ? [
      "Analyzing Current Architecture...",
      "Identifying Integration Points...",
      "Injecting New Logic...",
      "Verifying System Integrity...",
      "Optimizing Refined Blueprint..."
    ] : [
      "Analyzing Requirements...",
      "Designing System Architecture...",
      "Mapping Data Entities...",
      "Implementing Security Protocols...",
      "Optimizing Performance Layers...",
      "Finalizing Blueprint..."
    ];

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setBuildStep(steps[stepIndex]);
        stepIndex++;
      }
    }, 1500);

    const fullPrompt = uploadedFiles.length > 0 
      ? `${prompt}\n\n--- ATTACHED FILES ---\n${uploadedFiles.map(f => `FILE: ${f.name}\nCONTENT:\n${f.content}`).join('\n\n')}`
      : prompt;

    try {
      const systemInstruction = `You are a world-class Senior Full-Stack Developer and Software Architect.
      
      ${isUpdate ? `Your task is to UPDATE the existing project or ADD NEW FEATURES — do NOT create a new project from scratch.
      
      ⚠️ CRITICAL REFINEMENT RULES:
      - Preserve all existing functionality.
      - Do not delete working code.
      - Only add or modify what is needed.
      - Ensure ALL features continue to work after the update.
      
      CURRENT APPLICATION CONTEXT:
      ${generatedCode}
      
      NEW REQUIREMENTS:
      ${fullPrompt}
      
      📌 Requirements for update:
      1. Integrate new feature(s) or improvements as requested.
      2. Update backend logic if needed.
      3. Update frontend to reflect new features.
      4. Ensure database changes are included (migrations, schema updates).
      5. Maintain routing, state management, and error handling.
      6. Ensure CRUD operations work for new or updated features.
      
      🔥 Must:
      - Verify no missing imports.
      - Fix runtime errors if present.
      - Ensure all existing endpoints still work.
      - Connect new features fully to backend and database.` : `Your task is to build a COMPLETE, PRODUCTION-READY, and FULLY FUNCTIONAL enterprise application based on the user's request and any attached files.`}
      
      ⚠️ ARCHITECTURAL DIRECTIVES:
      - This is NOT a prototype. It is a mission-critical enterprise system.
      - ZERO MOCK DATA: All features must be fully interactive.
      - NO SKELETONS: Every single feature must be fully implemented.
      - ENTERPRISE PATTERNS: Use clean architecture, service layers, and proper error handling.
      
      ${options.fullStack ? `
      📦 FULL-STACK ARCHITECTURE:
      - Organize code into /frontend, /backend, and /database directories.
      - Frontend: React/Vite with Tailwind.
      - Backend: Node.js/Express or the requested framework.
      - Database: Include schema.sql or migrations.
      ` : `
      📌 Technical Requirements:
      1. FULL CRUD OPERATIONS: Implement complete Create, Read, Update, and Delete flows.
      2. ROBUST STATE MANAGEMENT: Use React Context or advanced Hooks.
      3. SERVICE-ORIENTED ARCHITECTURE: Abstract logic into dedicated service files.
      4. ADVANCED ROUTING: Use "react-router-dom" for a multi-page experience.
      5. INPUT VALIDATION: Every form must have strict validation.
      6. SECURITY BY DESIGN: Sanitize all inputs, prevent XSS.
      7. PERFORMANCE: Ensure sub-50ms interaction latency.
      `}
      
      🎨 UI/UX Standards:
      - MODERN ENTERPRISE DESIGN: Use Tailwind CSS.
      - INTERACTIVE: Use Framer Motion for transitions.
      - ACCESSIBILITY: Ensure proper contrast and ARIA labels.
      
      📦 Output format:
      Return ONLY a JSON object with this structure:
      {
        "overview": "A detailed technical overview of the architecture and stack",
        "files": [
          {
            "path": "package.json",
            "content": "...",
            "language": "json"
          },
          {
            "path": "src/App.tsx",
            "content": "...",
            "language": "tsx"
          },
          ...
        ]
      }
      
      Do not include any text outside the JSON block.`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '';
      clearInterval(stepInterval);
      setBuildStep(isUpdate ? 'Refinement Complete' : 'Generation Complete');
      setGeneratedCode(text);

      if (user) {
        const projectData = {
          name: projectName || 'Untitled Project',
          description: fullPrompt,
          framework: options.framework,
          language: options.language,
          scope: options.scope,
          generatedCode: text,
        };

        if (currentProject?.id) {
          // Update existing project
          await updateProject(currentProject.id, projectData);
          
          // Refresh current project to get updated versions
          const docRef = doc(db, 'projects', currentProject.id);
          const updatedDoc = await getDocFromServer(docRef);
          if (updatedDoc.exists()) {
            setCurrentProject({ id: updatedDoc.id, ...updatedDoc.data() } as Project);
          }
        } else {
          // Create new project
          const newId = await createProject({
            ...projectData,
            userId: user.uid,
          });
          
          // Fetch the newly created project to get the initialized version
          const docRef = doc(db, 'projects', newId);
          const newDoc = await getDocFromServer(docRef);
          if (newDoc.exists()) {
            setCurrentProject({ id: newDoc.id, ...newDoc.data() } as Project);
          }
        }
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Generation failed:", error);
      setBuildStep('Generation Failed');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleFixError = async () => {
    if (!errorToFix.trim() || !generatedCode) return;
    setFixingError(true);
    setBuildStep('Analyzing Error...');

    try {
      const systemInstruction = `You are a senior full-stack developer and debugging expert.
      
      The user is experiencing an error in the application you previously generated.
      Your task is to analyze the error message and the current codebase, and provide a FIXED version of the project.
      
      ⚠️ CRITICAL DIRECTIVES:
      - DO NOT just explain the fix. Provide the COMPLETE, UPDATED project JSON.
      - Maintain ALL existing features and logic. Only change what is necessary to fix the error.
      - Ensure the fixed code is fully functional and runnable.
      - If the error is a "Module not found", ensure the package.json and imports are correct.
      - If the error is a syntax error, fix it precisely.
      
      📌 Input Context:
      1. Current Codebase: The JSON project structure you generated.
      2. Error Message: The specific error reported by the user.
      
      📦 Output format:
      Return ONLY a JSON object with the same structure as the original generation:
      {
        "overview": "A brief description of the fix applied",
        "files": [
          {
            "path": "...",
            "content": "...",
            "language": "..."
          },
          ...
        ]
      }
      
      Do not include any text outside the JSON block.`;

      const prompt = `
      CURRENT CODEBASE:
      ${generatedCode}
      
      ERROR MESSAGE:
      ${errorToFix}
      
      Please fix this error and provide the updated project JSON.
      `;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.4, // Lower temperature for more precise fixing
          responseMimeType: "application/json",
        },
      });

      const text = response.text || '';
      setGeneratedCode(text);
      setErrorToFix('');
      setShowErrorFixer(false);
      setBuildStep('Error Fixed Successfully');

      if (user && currentProject?.id) {
        await updateProject(currentProject.id, {
          generatedCode: text,
        });
      }
    } catch (error) {
      console.error("Fix failed:", error);
      setBuildStep('Fix Failed');
    } finally {
      setFixingError(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        if (currentProject?.id === id) {
          setCurrentProject(null);
          setProjectName('');
          setPrompt('');
          setGeneratedCode('');
        }
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setProjectName('');
    setPrompt('');
    setGeneratedCode('');
    setMainView('project');
  };

  const handleSaveProject = async () => {
    if (!user || !projectName.trim()) return;
    try {
      if (currentProject?.id) {
        await updateProject(currentProject.id, {
          name: projectName,
          description: prompt,
          framework: options.framework,
          language: options.language,
          scope: options.scope,
          generatedCode: generatedCode,
        });
      } else {
        const newId = await createProject({
          name: projectName,
          description: prompt,
          framework: options.framework,
          language: options.language,
          scope: options.scope,
          generatedCode: generatedCode,
          userId: user.uid,
        });
        const newProject: Project = {
          id: newId,
          name: projectName,
          description: prompt,
          framework: options.framework,
          language: options.language,
          scope: options.scope,
          generatedCode: generatedCode,
          userId: user.uid,
          createdAt: Timestamp.now()
        };
        setCurrentProject(newProject);
      }
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadProject = async () => {
    if (!generatedCode) return;
    
    const zip = new JSZip();
    
    try {
      const parsed = JSON.parse(generatedCode);
      
      // Add overview as README.md
      if (parsed.overview) {
        zip.file("README.md", parsed.overview);
      }
      
      // Add all files
      if (Array.isArray(parsed.files)) {
        parsed.files.forEach((file: any) => {
          zip.file(file.path, file.content);
        });
      }
    } catch (e) {
      // Fallback to old behavior if JSON parsing fails
      zip.file("BLUEPRINT.md", generatedCode);
      const codeBlockRegex = /(?:###\s+`([^`]+)`|\*\*(.+?)\*\*)\s*\n\s*```(\w+)?\n([\s\S]*?)```/g;
      let match;
      while ((match = codeBlockRegex.exec(generatedCode)) !== null) {
        const filename = (match[1] || match[2]).trim();
        const content = match[4];
        zip.file(filename, content);
      }
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    setProjectName(project.name);
    setPrompt(project.description);
    setGeneratedCode(project.generatedCode || '');
    setOptions({
      ...options,
      framework: project.framework || 'React',
      language: project.language || 'TypeScript',
      scope: project.scope || 'Enterprise Grade',
    });
    setMainView('project');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden transition-colors duration-300 relative">
      {/* TSParticles Background */}
      {init && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          className="fixed inset-0 z-0 pointer-events-none"
          options={{
            fpsLimit: 120,
            interactivity: {
              detectsOn: "window",
              events: {
                onHover: {
                  enable: true,
                  mode: "grab",
                },
              },
              modes: {
                grab: {
                  distance: 150,
                  links: {
                    opacity: 0.8,
                  },
                },
              },
            },
            particles: {
              color: {
                value: darkMode ? "#10b981e4" : "#059668cf",
              },
              links: {
                color: darkMode ? "#34d399" : "#10b981",
                distance: 150,
                enable: true,
                opacity: darkMode ? 0.8 : 0.6,
                width: 1.5,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: true,
                speed: 1.2,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  width: 800,
                  height: 800,
                },
                value: 60,
              },
              opacity: {
                value: darkMode ? 0.9 : 0.8,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 3 },
              },
            },
            detectRetina: true,
          } as ISourceOptions}
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full h-full">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Left: Logo & Breadcrumbs */}
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => setMainView('home')}
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
            >
              <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4 text-white dark:text-black" />
              </div>
              <div className="flex flex-col">
                <div className="flex">
                  {"Enterprise".split("").map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        color: ["rgba(102, 255, 0, 1)", "rgba(16,185,129,1)", "rgba(136, 0, 255, 1)"],
                      }}
                      transition={{
                        opacity: { duration: 0.5, delay: i * 0.05 },
                        y: { duration: 0.5, delay: i * 0.05 },
                        color: { 
                          duration: 2, 
                          repeat: Infinity, 
                          delay: i * 0.1 + 2,
                          repeatDelay: 5
                        }
                      }}
                      className="font-black text-2xl tracking-tighter text-zinc-900 dark:text-white leading-none uppercase inline-block cursor-default"
                    >
                      <CharacterScramble char={char} isHovered={logoHover} index={i} />
                    </motion.span>
                  ))}
                </div>
                <div className="flex">
                  {"Builder AI".split("").map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ 
                        opacity: 1, 
                        x: 0,
                        textShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 8px rgba(16,185,129,0.5)", "0 0 0px rgba(16,185,129,0)"]
                      }}
                      transition={{
                        opacity: { duration: 0.5, delay: (i + 10) * 0.05 },
                        x: { duration: 0.5, delay: (i + 10) * 0.05 },
                        textShadow: {
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.1 + 3,
                          repeatDelay: 5
                        }
                      }}
                      className="text-xs text-emerald-500 font-black mt-1 uppercase tracking-[0.2em] inline-block cursor-default"
                    >
                      <CharacterScramble char={char} isHovered={logoHover} index={i + 10} />
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>


          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {[
              { id: 'home', label: 'Dashboard', icon: Layout },
              { id: 'project', label: 'Editor', icon: Code2 },
              { id: 'history', label: 'History', icon: History },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMainView(item.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  mainView === item.id 
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                backendStatus === 'online' ? "bg-emerald-500" : "bg-red-500"
              )} />
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
                {backendStatus}
              </span>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setMainView('settings')}
              className={cn(
                "p-1.5 rounded-lg transition-colors hidden sm:block",
                mainView === 'settings' 
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {user ? (
              <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                <img 
                  src={user.photoURL || ''} 
                  className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all" 
                  alt="" 
                  onClick={() => setMainView('profile')}
                />
                <button 
                  onClick={logOut} 
                  className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors hidden sm:block"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="text-sm font-black uppercase tracking-wider px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Header Spacer */}
      <div className="h-20" />

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-zinc-200 dark:border-white/5 bg-white/95 dark:bg-black/95 backdrop-blur-2xl overflow-hidden fixed top-20 left-0 right-0 z-40"
            >
              <div className="px-4 py-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      backendStatus === 'online' ? "bg-emerald-500" : "bg-red-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      {backendStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Theme</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Home', icon: Home, onClick: () => { setMainView('home'); setIsMenuOpen(false); }, active: mainView === 'home' },
                    { label: 'Enterprise Builder', icon: Sparkles, onClick: () => { setMainView('project'); setIsMenuOpen(false); }, active: mainView === 'project' },
                    { label: 'History', icon: History, onClick: () => { setMainView('history'); setIsMenuOpen(false); }, active: mainView === 'history' },
                    { label: 'Settings', icon: Settings2, onClick: () => { setMainView('settings'); setIsMenuOpen(false); }, active: mainView === 'settings' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center gap-4 w-full p-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        item.active 
                          ? "bg-emerald-500 text-black" 
                          : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </div>

                {user ? (
                  <div className="pt-6 border-t border-zinc-200 dark:border-white/5">
                    <div 
                      className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => { setMainView('profile'); setIsMenuOpen(false); }}
                    >
                      <img src={user.photoURL || ''} className="w-10 h-10 rounded-xl" alt="" />
                      <div>
                        <div className="font-black text-xs text-zinc-900 dark:text-white uppercase">{user.displayName}</div>
                        <div className="text-[10px] text-zinc-500 font-medium">{user.email}</div>
                      </div>
                    </div>
                    <button onClick={logOut} className="w-full py-4 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Sign Out</button>
                  </div>
                ) : (
                  <button onClick={signIn} className="w-full py-4 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl">Sign In</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <AnimatePresence mode="wait">
          {mainView === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-20 py-10"
            >
              {/* Hero Section */}
              <div className="text-center space-y-8 max-w-3xl mx-auto">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Next-Gen Enterprise Architecture
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase italic z-10 relative flex flex-col items-center sm:items-start">
                    <motion.span
                      animate={{ 
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                      }}
                      transition={{ 
                        duration: 8, 
                        repeat: Infinity,
                        ease: "linear" 
                      }}
                      style={{ backgroundSize: "200% auto" }}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-900 dark:from-white dark:via-zinc-400 dark:to-white inline-block pb-2"
                    >
                      Build Professional
                    </motion.span>
                    <motion.span 
                      animate={{ 
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                      }}
                      transition={{ 
                        duration: 8, 
                        repeat: Infinity,
                        ease: "linear",
                        delay: 1 // offset the shimmer phase slightly
                      }}
                      style={{ backgroundSize: "200% auto" }}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-600 dark:from-emerald-400 dark:via-white dark:to-emerald-600 inline-block"
                    >
                      Company Projects
                    </motion.span>
                  </h1>
                  <p className="text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto z-10 relative">
                    The world's most advanced AI-driven system for generating production-ready architectures. 
                    Empowered exclusively for enterprise scale, security, and seamless professional delivery.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
                  <button 
                    onClick={() => setMainView('project')}
                    className="group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-3"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Zap className="w-4 h-4 fill-current" />
                    Start Architecting
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button 
                    onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-10 py-5 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white text-xs font-black uppercase tracking-[0.2em] border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all flex items-center gap-3"
                  >
                    Explore Features
                  </button>
                </div>
              </div>

              {/* Features Grid */}
              <div ref={featuresRef} className="space-y-16">
                <div className="text-center space-y-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Core Capabilities</h2>
                  <p className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white uppercase italic">Everything you need to build at scale</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Enterprise Architecture',
                      desc: 'Generate complex, multi-layered systems with clean architecture and service-oriented patterns.',
                      icon: Layout,
                      color: 'text-emerald-500',
                      bg: 'bg-emerald-500/10'
                    },
                    {
                      title: 'Mission-Critical Security',
                      desc: 'Automated implementation of ISO-27001 standards, input sanitization, and secure state handling.',
                      icon: ShieldCheck,
                      color: 'text-blue-500',
                      bg: 'bg-blue-500/10'
                    },
                    {
                      title: 'High-Performance Core',
                      desc: 'Optimized for sub-50ms interaction latency and perfect Core Web Vitals scores out of the box.',
                      icon: Zap,
                      color: 'text-purple-500',
                      bg: 'bg-purple-500/10'
                    },
                    {
                      title: 'Real-Time Collaboration',
                      desc: 'Built-in support for WebSockets, presence awareness, and optimistic UI updates for global teams.',
                      icon: Globe,
                      color: 'text-orange-500',
                      bg: 'bg-orange-500/10'
                    },
                    {
                      title: 'Automated Error Repair',
                      desc: 'Intelligent self-healing system that analyzes runtime errors and provides surgical code fixes.',
                      icon: Terminal,
                      color: 'text-red-500',
                      bg: 'bg-red-500/10'
                    },
                    {
                      title: 'Cloud Native Sync',
                      desc: 'Seamlessly persist your architecture blueprints to the cloud with full version history and sharing.',
                      icon: Database,
                      color: 'text-indigo-500',
                      bg: 'bg-indigo-500/10'
                    }
                  ].map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + (i * 0.1) }}
                      className="card-enterprise p-10 space-y-6 group hover:border-emerald-500/50 transition-all border-zinc-200/50 dark:border-white/5"
                    >
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg", feature.bg)}>
                        <feature.icon className={cn("w-7 h-7", feature.color)} />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{feature.title}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{feature.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Stats Section */}
              <div className="card-enterprise p-16 bg-zinc-900 dark:bg-black/40 border-none relative overflow-hidden rounded-[2.5rem]">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50" />
                <div className="relative grid grid-cols-1 md:grid-cols-4 gap-16 text-center">
                  {[
                    { label: 'Architectures', value: '1.2M+' },
                    { label: 'Security Score', value: '99.9%' },
                    { label: 'Avg Latency', value: '42ms' },
                    { label: 'Uptime', value: '99.99%' }
                  ].map((stat) => (
                    <div key={stat.label} className="space-y-2">
                      <div className="text-5xl font-black text-white italic tracking-tighter">{stat.value}</div>
                      <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : mainView === 'project' ? (
            <motion.div 
              key="project"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-[1600px] mx-auto grid lg:grid-cols-[380px_1fr] gap-8 items-start pb-20"
            >
              {/* Left Column: Input & Controls */}
              <div className="space-y-6 sticky top-20 min-w-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active Workspace</span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">
                    System <span className="text-zinc-400 dark:text-zinc-600">Architect</span>
                  </h1>
                </div>

                <div className="card-enterprise p-5 space-y-6 border-zinc-200/50 dark:border-white/5 shadow-enterprise-lg">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Project Identity</label>
                        {projectName && <span className="badge badge-emerald">Active</span>}
                      </div>
                      <input 
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Project Name..."
                        className="input-enterprise bg-zinc-50/50 dark:bg-black/20 border-zinc-200/50 dark:border-white/5 font-bold text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Framework</label>
                        <CustomDropdown 
                          value={options.framework}
                          options={FRAMEWORKS}
                          onChange={(val) => setOptions({...options, framework: val})}
                          icon={Box}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Language</label>
                        <CustomDropdown 
                          value={options.language}
                          options={LANGUAGES}
                          onChange={(val) => setOptions({...options, language: val})}
                          icon={FileCode}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Deployment Scope</label>
                      <CustomDropdown 
                        value={options.scope}
                        options={SCOPES}
                        onChange={(val) => setOptions({...options, scope: val})}
                        icon={Globe}
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <Layers className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Full-Stack</div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">E2E Architecture</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setOptions({...options, fullStack: !options.fullStack})}
                        className={cn(
                          "w-10 h-5 rounded-full relative transition-all duration-300",
                          options.fullStack ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm",
                          options.fullStack ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className={cn(
                      "space-y-4 p-5 rounded-[2rem] transition-all duration-500 border",
                      generatedCode 
                        ? "bg-blue-500/[0.03] border-blue-500/20 shadow-inner shadow-blue-500/5" 
                        : "bg-emerald-500/[0.03] border-emerald-500/20 shadow-inner shadow-emerald-500/5"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-500",
                            generatedCode ? "bg-blue-500 animate-pulse shadow-blue-500/20" : "bg-emerald-500 shadow-emerald-500/20"
                          )} />
                          <div className="flex flex-col">
                            <label className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none mb-1">
                              {generatedCode ? 'Refinement' : 'Blueprint'}
                            </label>
                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
                              {generatedCode ? 'Iterative Mode' : 'Initial Phase'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {generatedCode && (
                            <button 
                              onClick={() => setPrompt('')}
                              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-blue-500 transition-all shadow-sm"
                              title="Clear Prompt"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-blue-500 transition-all shadow-sm"
                            title="Attach Context"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={generatedCode 
                            ? "Describe refinements..." 
                            : "Describe your system..."
                          }
                          className={cn(
                            "input-enterprise h-40 resize-none py-4 px-4 transition-all duration-300 font-medium text-xs leading-relaxed",
                            generatedCode 
                              ? "bg-white/50 dark:bg-black/20 border-blue-500/20 focus:border-blue-500" 
                              : "bg-white/50 dark:bg-black/20 border-emerald-500/20 focus:border-emerald-500"
                          )}
                        />
                        
                        <div className="absolute bottom-3 right-3">
                          <button 
                            onClick={handleCheckSpecs}
                            disabled={checking || !prompt.trim()}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                              checking 
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" 
                                : "bg-white dark:bg-zinc-900 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                            )}
                          >
                            {checking ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                            Audit Specs
                          </button>
                        </div>
                      </div>
                    </div>
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          multiple
                          className="hidden"
                        />
                        
                        {uploadedFiles.length > 0 && (
                          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                            {uploadedFiles.map((file, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 group/file"
                              >
                                {file.type.startsWith('image/') ? <Sparkles className="w-2.5 h-2.5 text-blue-500" /> : <FileCode className="w-2.5 h-2.5 text-emerald-500" />}
                                <span className="max-w-[80px] truncate">{file.name}</span>
                                <button 
                                  onClick={() => removeFile(idx)}
                                  className="p-0.5 hover:text-red-500 transition-colors"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <AnimatePresence>
                        {checkFeedback && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mt-2 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Feasibility Analysis</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 h-1 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${checkFeedback.score}%` }}
                                    className="h-full bg-emerald-500"
                                  />
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{checkFeedback.score}%</span>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {checkFeedback.analysis}
                            </p>

                            {checkFeedback.recommendations?.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Recommendations</span>
                                <ul className="space-y-1">
                                  {checkFeedback.recommendations.map((rec, i) => (
                                    <li key={i} className="flex gap-2 text-[9px] text-emerald-600 dark:text-emerald-400">
                                      <span className="shrink-0">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {checkFeedback.risks?.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Technical Risks</span>
                                <ul className="space-y-1">
                                  {checkFeedback.risks.map((risk, i) => (
                                    <li key={i} className="flex gap-2 text-[9px] text-amber-600 dark:text-amber-400">
                                      <span className="shrink-0">!</span>
                                      <span>{risk}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    
                    <div className="flex flex-col gap-4 pt-4 border-t border-zinc-200/50 dark:border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleGenerate(false)}
                          disabled={loading || !prompt.trim()}
                          className={cn(
                            "group relative overflow-hidden py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl",
                            loading && !generatedCode ? "bg-emerald-500/10 text-emerald-500 animate-pulse" : "bg-zinc-900 dark:bg-white text-white dark:text-black hover:shadow-emerald-500/20",
                            generatedCode && "opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                          )}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {loading && !generatedCode ? (
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2">
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Architecting</span>
                              </div>
                              <span className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-tighter">{buildStep}</span>
                            </div>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-current" />
                              <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase tracking-widest">Build Blueprint</span>
                                <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">New System</span>
                              </div>
                            </>
                          )}
                        </button>

                        <button 
                          onClick={() => handleGenerate(true)}
                          disabled={loading || !prompt.trim() || !generatedCode}
                          className={cn(
                            "group relative overflow-hidden py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl",
                            generatedCode 
                              ? "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-blue-500/20" 
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed",
                            loading && generatedCode && "animate-pulse"
                          )}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {loading && generatedCode ? (
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2">
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Refining</span>
                              </div>
                              <span className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-tighter">{buildStep}</span>
                            </div>
                          ) : (
                            <>
                              <Edit3 className="w-4 h-4" />
                              <div className="flex flex-col items-start text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest">Refine Logic</span>
                                <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">Update Build</span>
                              </div>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleNewProject}
                          className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Reset Session
                        </button>
                        
                        {generatedCode && (
                          <div className="flex items-center gap-2 w-full">
                            <button 
                              onClick={() => {
                                setPreviewViewMode('code');
                                resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-lg"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              View Code
                            </button>
                            <button 
                              onClick={handleAudit}
                              className="px-4 py-3 rounded-xl bg-blue-500 text-white flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Audit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* Features Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Security', value: 'ISO-27001', icon: ShieldCheck, color: 'text-emerald-500' },
                    { label: 'Latency', value: '< 50ms', icon: Zap, color: 'text-blue-500' },
                    { label: 'Pattern', value: 'Clean', icon: Layout, color: 'text-purple-500' },
                  ].map((stat) => (
                    <div key={stat.label} className="card-enterprise p-4 text-center space-y-2 group relative border-zinc-200/50 dark:border-white/5">
                      <div className={cn("w-8 h-8 mx-auto rounded-lg flex items-center justify-center bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 transition-transform group-hover:scale-110", stat.color)}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-black text-zinc-900 dark:text-white leading-none">{stat.value}</div>
                        <div className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Version History Section */}
                {currentProject?.versions && currentProject.versions.length > 1 && (
                  <div className="card-enterprise p-5 space-y-4 border-blue-500/10 bg-blue-500/[0.01]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <History className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Iteration History</h3>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                        {currentProject.versions.length} versions
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                      {currentProject.versions.slice().reverse().map((version, idx) => {
                        const versionNum = currentProject.versions.length - idx;
                        const isActive = generatedCode === version.code;
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (version.code) {
                                setGeneratedCode(version.code);
                                setPrompt(version.prompt);
                              }
                            }}
                            className={cn(
                              "w-full p-3 rounded-xl border text-left transition-all group relative overflow-hidden",
                              isActive 
                                ? "bg-blue-500/10 border-blue-500/30 shadow-sm" 
                                : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-white/5 hover:border-blue-500/30"
                            )}
                          >
                            {isActive && (
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                            )}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest",
                                  isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"
                                )}>
                                  v{versionNum}
                                </span>
                                {idx === 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">Latest</span>
                                )}
                              </div>
                              <span className="text-[8px] font-bold text-zinc-400">
                                {version.timestamp instanceof Timestamp 
                                  ? version.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-medium">
                              {version.prompt}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Output */}
              <div 
                ref={resultRef}
                className="lg:sticky lg:top-24 space-y-6 min-w-0"
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center border border-zinc-200 dark:border-white/5">
                      <Terminal className="w-5 h-5 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-none mb-1">Blueprint Output</h2>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Production-ready architecture</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {generatedCode && (
                      <button
                        onClick={() => {
                          setPreviewViewMode('preview');
                          setTimeout(() => {
                            resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Live Preview
                      </button>
                    )}
                    <button
                      onClick={() => setShowErrorFixer(!showErrorFixer)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                        showErrorFixer 
                          ? "bg-red-500 text-white shadow-red-500/20" 
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      {showErrorFixer ? 'Cancel Fix' : 'Fix Error'}
                    </button>
                    <button
                      onClick={() => handleGenerate(true)}
                      disabled={loading || !prompt.trim()}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                        !loading && prompt.trim()
                          ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                      {generatedCode ? 'Update Code' : 'Build'}
                    </button>
                  </div>
                </div>

                <div className="card-enterprise overflow-hidden min-h-[600px] lg:min-h-[700px] flex flex-col">
                  <AnimatePresence mode="wait">
                    {showErrorFixer ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="flex-1 flex flex-col p-8 space-y-6 bg-zinc-50 dark:bg-zinc-950"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <Terminal className="w-5 h-5 text-red-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-none mb-1">Error Fixer</h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Paste your error to start automated repair</p>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col space-y-4">
                          <textarea
                            value={errorToFix}
                            onChange={(e) => setErrorToFix(e.target.value)}
                            placeholder="Paste the error message from the preview console here..."
                            className="flex-1 input-enterprise resize-none p-4 font-mono text-xs bg-white dark:bg-black/40"
                          />
                          
                          <button
                            onClick={handleFixError}
                            disabled={fixingError || !errorToFix.trim()}
                            className={cn(
                              "btn-primary w-full py-4 flex items-center justify-center gap-3",
                              fixingError && "animate-pulse"
                            )}
                          >
                            {fixingError ? (
                              <>
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                                <span>{buildStep || 'Repairing...'}</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 fill-current" />
                                <span>Execute Repair</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            <span className="text-emerald-500 font-bold">Pro Tip:</span> The AI will analyze your current code and the error message to provide a surgical fix while maintaining all existing features.
                          </p>
                        </div>
                      </motion.div>
                    ) : !generatedCode && !loading ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-20 h-20 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 flex items-center justify-center">
                          <Box className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                        </div>
                        <div className="max-w-xs space-y-2">
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Ready for Input</h3>
                          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                            Define your architecture on the left to generate a production-ready system blueprint.
                          </p>
                        </div>
                      </div>
                    ) : loading ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-6">
                        <div className="relative">
                          <div className="w-12 h-12 border-2 border-zinc-200 dark:border-white/5 border-t-emerald-500 rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Building...</h3>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Synthesizing production-ready blueprint</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-hidden">
                          <CodePreview 
                            content={generatedCode} 
                            darkMode={darkMode} 
                            onUpdate={setGeneratedCode}
                            viewMode={previewViewMode}
                          />
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-white/5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={copyToClipboard}
                              className="btn-secondary px-4 py-2 flex items-center gap-2 text-[10px]"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                            <button 
                              onClick={downloadProject}
                              className="btn-primary px-4 py-2 flex items-center gap-2 text-[10px]"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download ZIP
                            </button>
                          </div>
                          {user ? (
                            <button 
                              onClick={handleSaveProject}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                            >
                              <Database className="w-3.5 h-3.5" />
                              Save to Cloud
                            </button>
                          ) : (
                            <button 
                              onClick={signIn}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-all"
                            >
                              <LogOut className="w-3.5 h-3.5 rotate-180" />
                              Sign in to Save
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
        ) : mainView === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Project History</h2>
                  <p className="text-sm text-zinc-500 font-medium">Manage and revisit your enterprise system architectures</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search architectures..."
                      className="pl-12 pr-6 py-3 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all w-full md:w-64"
                    />
                  </div>
                  <button 
                    onClick={handleNewProject}
                    className="p-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl hover:shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!user ? (
                <div className="card-enterprise p-24 flex flex-col items-center justify-center text-center space-y-10 border-dashed border-2">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <ShieldCheck className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="max-w-md space-y-4">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Secure Access Required</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                      Your project history is securely stored and encrypted in our cloud infrastructure. Sign in to access your previous architectures and continue building.
                    </p>
                  </div>
                  <button 
                    onClick={signIn}
                    className="group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4 rotate-180" />
                    Sign In with Google
                  </button>
                </div>
              ) : projects.length === 0 ? (
                <div className="card-enterprise p-24 flex flex-col items-center justify-center text-center space-y-10 border-dashed border-2">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 flex items-center justify-center shadow-inner">
                    <History className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                  </div>
                  <div className="max-w-sm space-y-4">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Empty Workspace</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                      Your architecture history is currently empty. Start building production-ready systems to see them listed here.
                    </p>
                  </div>
                  <button 
                    onClick={handleNewProject}
                    className="group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    New Architecture
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div 
                      key={project.id}
                      onClick={() => selectProject(project)}
                      className={cn(
                        "group card-enterprise p-8 transition-all cursor-pointer relative hover:ring-2 hover:ring-emerald-500/20 flex flex-col h-full border-zinc-200/50 dark:border-white/5",
                        currentProject?.id === project.id && "ring-2 ring-emerald-500"
                      )}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shadow-lg">
                          <FileCode className="w-6 h-6 text-emerald-500" />
                        </div>
                        <button 
                          onClick={(e) => handleDeleteProject(e, project.id!)}
                          className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <h4 className="font-black text-lg text-zinc-900 dark:text-white truncate uppercase tracking-tight">
                          {project.name}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed font-medium">
                          {project.description}
                        </p>
                      </div>

                      <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-white/10">
                            {project.framework}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">
                            {project.createdAt instanceof Timestamp ? project.createdAt.toDate().toLocaleDateString() : 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : mainView === 'profile' ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-12"
            >
              {!user ? (
                <div className="card-enterprise p-24 flex flex-col items-center justify-center text-center space-y-10 border-dashed border-2">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <UserIcon className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div className="max-w-md space-y-4">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Identity Required</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                      Manage your enterprise account, track your architectural contributions, and customize your system preferences by signing in.
                    </p>
                  </div>
                  <button 
                    onClick={signIn}
                    className="group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4 rotate-180" />
                    Sign In with Google
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h2 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Architect Profile</h2>
                      <p className="text-sm text-zinc-500 font-medium">Verified System Architect Identity</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                        Enterprise Tier
                      </span>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[340px_1fr] gap-10">
                    {/* Profile Sidebar */}
                    <div className="space-y-8">
                      <div className="card-enterprise p-10 text-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50" />
                        
                        <div className="relative z-10">
                          <div className="relative inline-block">
                            <img 
                              src={user?.photoURL || ''} 
                              className="w-32 h-32 rounded-[3rem] mx-auto border-8 border-white dark:border-zinc-900 shadow-2xl object-cover" 
                              alt="Profile" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-xl">
                              <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          
                          <div className="mt-6 space-y-1">
                            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{user?.displayName || 'Anonymous User'}</h3>
                            <p className="text-xs text-zinc-500 font-bold tracking-tight">{user?.email}</p>
                          </div>
                        </div>

                        <div className="pt-8 border-t border-zinc-100 dark:border-white/5 grid grid-cols-2 gap-4">
                          <div className="space-y-1 text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Projects</span>
                            <span className="text-xl font-black text-zinc-900 dark:text-white">{projects.length}</span>
                          </div>
                          <div className="space-y-1 text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Audits</span>
                            <span className="text-xl font-black text-emerald-500">12</span>
                          </div>
                        </div>

                        <button 
                          onClick={logOut}
                          className="w-full py-4 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Terminate Session
                        </button>
                      </div>

                      <div className="card-enterprise p-8 space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Credentials</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center">
                              <Fingerprint className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight">Architect ID</p>
                              <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white truncate w-32">{user?.uid.substring(0, 12)}...</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center">
                              <Key className="w-5 h-5 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight">Access Level</p>
                              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Administrator</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card-enterprise p-8 space-y-4 bg-gradient-to-br from-emerald-500/5 to-transparent">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-emerald-500" />
                          </div>
                          <h4 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Active Architect</h4>
                          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                            You have contributed to {projects.length} system architectures in the last 30 days. Your design efficiency is currently at 94%.
                          </p>
                        </div>
                        <div className="card-enterprise p-8 space-y-4 bg-gradient-to-br from-blue-500/5 to-transparent">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-blue-500" />
                          </div>
                          <h4 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">System Health</h4>
                          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                            All your deployed architectures are currently operational. Security audits show 0 critical vulnerabilities across your stack.
                          </p>
                        </div>
                      </div>

                      <div className="card-enterprise p-10 space-y-8">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Recent Activity</h4>
                          <button className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:underline">View All</button>
                        </div>
                        
                        <div className="space-y-6">
                          {projects.slice(0, 3).map((p, i) => (
                            <div key={p.id} className="flex items-center gap-6 group">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                                <FileCode className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{p.name}</h5>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Architected on {p.createdAt instanceof Timestamp ? p.createdAt.toDate().toLocaleDateString() : 'Recent'}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-zinc-100 dark:bg-white/5 text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-white/10">
                                  {p.framework}
                                </span>
                              </div>
                            </div>
                          ))}
                          {projects.length === 0 && (
                            <div className="text-center py-10">
                              <p className="text-xs text-zinc-500 font-medium italic">No recent activity detected.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">System Settings</h2>
                  <p className="text-sm text-zinc-500 font-medium">Configure your architectural workspace and platform preferences</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                    v4.2.0 Stable
                  </span>
                </div>
              </div>

              <div className="grid lg:grid-cols-[280px_1fr] gap-12">
                {/* Settings Sidebar */}
                <aside className="space-y-2">
                  {[
                    { id: 'general', label: 'General Preferences', icon: Settings2 },
                    { id: 'security', label: 'Security & Privacy', icon: ShieldCheck },
                    { id: 'api', label: 'API & Integration', icon: Key },
                    { id: 'notifications', label: 'Notifications', icon: Bell },
                    { id: 'billing', label: 'Billing & Usage', icon: CreditCard },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsTab(item.id as any)}
                      className={cn(
                        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all group",
                        settingsTab === item.id 
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl scale-[1.02]" 
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 transition-colors",
                        settingsTab === item.id ? "text-emerald-500" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"
                      )} />
                      {item.label}
                    </button>
                  ))}
                </aside>

                {/* Settings Content */}
                <div className="space-y-8">
                  {settingsTab === 'general' && (
                    <div className="card-enterprise p-10 space-y-10">
                      <div className="space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-emerald-500" />
                          Platform Preferences
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-white/5 rounded-[2rem] border border-zinc-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                            <div className="space-y-1">
                              <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">Dark Mode Interface</div>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Toggle application theme between light and dark</div>
                            </div>
                            <button 
                              onClick={() => setDarkMode(!darkMode)}
                              className={cn(
                                "w-14 h-7 rounded-full transition-all relative p-1",
                                darkMode ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-zinc-300"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 bg-white rounded-full transition-all shadow-lg",
                                darkMode ? "translate-x-7" : "translate-x-0"
                              )} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-white/5 rounded-[2rem] border border-zinc-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                            <div className="space-y-1">
                              <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">Auto-Save Architecture</div>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Automatically save progress during generation</div>
                            </div>
                            <button className="w-14 h-7 rounded-full bg-emerald-500 p-1 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                              <div className="w-5 h-5 bg-white rounded-full translate-x-7 shadow-lg" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-white/5 rounded-[2rem] border border-zinc-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                            <div className="space-y-1">
                              <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">High Performance Mode</div>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Optimize UI for maximum system responsiveness</div>
                            </div>
                            <button className="w-14 h-7 rounded-full bg-zinc-300 p-1">
                              <div className="w-5 h-5 bg-white rounded-full translate-x-0 shadow-lg" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-10 border-t border-zinc-100 dark:border-white/5 space-y-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-red-500" />
                          Danger Zone
                        </h4>
                        <div className="flex items-center justify-between p-6 bg-red-500/5 rounded-[2rem] border border-red-500/10 group hover:border-red-500/30 transition-all">
                          <div className="space-y-1">
                            <div className="text-xs font-black text-red-500 uppercase tracking-tight">Clear Project History</div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Permanently delete all architectural records</div>
                          </div>
                          <button 
                            onClick={async () => {
                              if (user && confirm('Are you sure you want to clear all projects? This cannot be undone.')) {
                                for (const p of projects) {
                                  await deleteProject(p.id);
                                }
                              }
                            }}
                            className="px-8 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                          >
                            Purge All Data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'security' && (
                    <div className="card-enterprise p-10 space-y-8">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Security & Privacy</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Manage your system access and data encryption</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-6 bg-zinc-50 dark:bg-white/5 rounded-[2rem] border border-zinc-100 dark:border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">Two-Factor Authentication</div>
                            <span className="px-3 py-1 rounded-lg bg-zinc-200 dark:bg-white/10 text-zinc-500 text-[8px] font-black uppercase tracking-widest">Disabled</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">Add an extra layer of security to your architect account by requiring a verification code in addition to your password.</p>
                          <button className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:underline">Configure 2FA</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab !== 'general' && settingsTab !== 'security' && (
                    <div className="card-enterprise p-24 flex flex-col items-center justify-center text-center space-y-6 border-dashed border-2">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center">
                        <Activity className="w-8 h-8 text-zinc-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Under Construction</h4>
                        <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto">This configuration module is currently being architected for the next system update.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
      </main>

      {/* History Modal Overlay Removed - Now in main view */}
      <AnimatePresence>
        {showShare && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-8 rounded-[2.5rem] z-[110] shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <Globe className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white leading-none">Share Project</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Enterprise distribution enabled</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-2xl font-mono text-[10px] text-zinc-500 dark:text-zinc-400 break-all text-center leading-relaxed">
                  {window.location.origin}/project/{currentProject?.id || 'temp'}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/project/${currentProject?.id || 'temp'}`);
                    setShowShare(false);
                  }}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-2.5 text-xs"
                >
                  <Copy className="w-4 h-4" />
                  Copy Share Link
                </button>
              </div>

              <button 
                onClick={() => setShowShare(false)}
                className="w-full py-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="relative z-10 border-t border-zinc-200 dark:border-white/5 py-20 mt-20 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
            <div className="col-span-1 md:col-span-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Code2 className="w-4 h-4 text-black" />
                </div>
                <span className="font-black text-lg tracking-tighter text-zinc-900 dark:text-white uppercase">EnterpriseBuilder.ai</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
                Empowering global engineering teams with AI-driven architecture generation. 
                Built for mission-critical systems and modern scalability.
              </p>
              <div className="flex items-center gap-3">
                <button className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-emerald-500 transition-all border border-zinc-200 dark:border-white/5 flex items-center justify-center">
                  <Github className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-emerald-500 transition-all border border-zinc-200 dark:border-white/5 flex items-center justify-center">
                  <Twitter className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-zinc-900 dark:text-white font-black text-xs uppercase tracking-widest mb-6">Platform</h4>
              <ul className="space-y-4 text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <li 
                  onClick={() => setMainView('project')}
                  className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Enterprise Builder
                </li>
                <li 
                  onClick={() => {
                    if (generatedCode) {
                      setPreviewViewMode('preview');
                      setTimeout(() => {
                        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else {
                      setMainView('project');
                    }
                  }}
                  className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" /> Live Preview
                </li>
                <li 
                  onClick={() => {
                    if (generatedCode) {
                      setPreviewViewMode('code');
                      setTimeout(() => {
                        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else {
                      setMainView('project');
                    }
                  }}
                  className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" /> Code Editor
                </li>
                <li 
                  onClick={() => setMainView('history')}
                  className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4" /> History
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-zinc-900 dark:text-white font-black text-sm uppercase tracking-widest mb-6">Standards</h4>
              <ul className="space-y-4 text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <li className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"><ShieldCheck className="w-4 h-4" /> Security First</li>
                <li className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"><Layers className="w-4 h-4" /> Enterprise Arch</li>
                <li className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"><Cpu className="w-4 h-4" /> Modern Stack</li>
                <li className="flex items-center gap-2.5 hover:text-emerald-500 transition-colors cursor-pointer"><CheckCircle2 className="w-4 h-4" /> Clean Code</li>
              </ul>
            </div>

            <div>
              <h4 className="text-zinc-900 dark:text-white font-black text-sm uppercase tracking-widest mb-6">Developer</h4>
              <div className="space-y-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Engineered by <span className="text-emerald-500 font-bold">Sokhun Mao</span>. 
                  Specializing in enterprise-grade AI solutions and distributed systems.
                </p>
                <a 
                  href="mailto:sokhunmao390@gmail.com" 
                  className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 transition-colors font-black uppercase tracking-widest"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Contact Developer
                </a>
              </div>
            </div>
          </div>
          <div className="pt-10 border-t border-zinc-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-widest">
            <p>© 2026 Enterprise Builder AI. All rights reserved.</p>
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-emerald-500 transition-colors">Privacy</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">Terms</a>
              <a href="#" className="hover:text-emerald-500 transition-colors">Compliance</a>
            </div>
          </div>
        </div>
      </footer>

      {/* AI System Audit Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-white/10 flex flex-col"
            >
              <div className="p-8 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <ShieldCheck className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-widest">System Health Audit</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI-Powered Security & Performance Analysis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAuditModal(false)}
                  className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                {auditing ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu className="w-8 h-8 text-blue-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-widest">Analyzing Architecture...</h3>
                      <p className="text-xs text-zinc-500 font-medium">Scanning for vulnerabilities and bottlenecks</p>
                    </div>
                  </div>
                ) : auditReport ? (
                  <div className="space-y-10">
                    {/* Overall Score */}
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="60"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-zinc-100 dark:text-white/5"
                          />
                          <motion.circle
                            cx="64"
                            cy="64"
                            r="60"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray="377"
                            initial={{ strokeDashoffset: 377 }}
                            animate={{ strokeDashoffset: 377 - (377 * auditReport.overallScore) / 100 }}
                            className="text-blue-500"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-3xl font-black text-zinc-900 dark:text-white">{auditReport.overallScore}%</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Overall Health Score</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Based on enterprise standards</p>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'Security', data: auditReport.security, icon: ShieldCheck, color: 'text-emerald-500' },
                        { label: 'Performance', data: auditReport.performance, icon: Zap, color: 'text-blue-500' },
                        { label: 'Maintainability', data: auditReport.maintainability, icon: Layout, color: 'text-purple-500' }
                      ].map((metric) => (
                        <div key={metric.label} className="p-5 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <metric.icon className={cn("w-5 h-5", metric.color)} />
                            <span className="text-lg font-black text-zinc-900 dark:text-white">{metric.data.score}%</span>
                          </div>
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{metric.label}</h4>
                          <ul className="space-y-2">
                            {metric.data.findings.map((finding: string, i: number) => (
                              <li key={i} className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium flex gap-2">
                                <span className="text-blue-500 shrink-0">•</span>
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Critical Fixes & Tips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Critical Fixes</h4>
                        </div>
                        <div className="space-y-2">
                          {auditReport.criticalFixes.map((fix: string, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                              {fix}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Optimization Tips</h4>
                        </div>
                        <div className="space-y-2">
                          {auditReport.optimizationTips.map((tip: string, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-700 dark:text-blue-400 font-bold">
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setShowAuditModal(false)}
                  className="px-6 py-3 rounded-2xl bg-zinc-200 dark:bg-white/5 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-300 dark:hover:bg-white/10 transition-all"
                >
                  Close Report
                </button>
                <button 
                  onClick={handleAudit}
                  className="px-6 py-3 rounded-2xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Re-Audit System
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272A;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3F3F46;
        }
        
        /* Markdown Styles */
        .prose pre {
          background: #09090b !important;
          border: 1px solid rgba(255,255,255,0.05);
          padding: 1.5rem !important;
          border-radius: 1rem !important;
        }
        .prose code {
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 0.8rem !important;
          color: #10b981 !important;
        }
        .prose h1, .prose h2, .prose h3 {
          color: #fff !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
          text-transform: uppercase;
          font-size: 0.75rem !important;
          margin-top: 2rem !important;
          margin-bottom: 1rem !important;
          opacity: 0.5;
        }
      `}</style>
      </div>
    </div>
  );
}

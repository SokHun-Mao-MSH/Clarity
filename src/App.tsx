import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Sparkles, 
  Terminal, 
  ChevronRight, 
  Copy, 
  Plus,
  History,
  Layout,
  FileCode,
  Trash2,
  Menu,
  X,
  Home,
  CheckCircle2,
  Sun,
  Moon,
  Box,
  Zap,
  Clock,
  Wand2,
  Bug,
  BrainCircuit,
  ArrowRight,
  Globe2,
  Settings2,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "./utils";
import Markdown from 'react-markdown';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { type Container, type ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'html', 'css', 
  'php', 'csharp', 'cpp', 'c', 'mysql', 'sql', 'dart', 'go', 'rust', 'json'
];

const OUTPUT_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Khmer', 'Vietnamese',
];

interface Project {
  id: string;
  name: string;
  description: string;
  language: string;
  outputLanguage?: string;
  scope: string;
  generatedCode: string;
  createdAt: number;
}

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
          <span className="truncate capitalize">{value}</span>
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
                    "w-full text-left px-4 py-2.5 text-sm font-medium transition-colors capitalize",
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [inputCode, setInputCode] = useState('// Paste your code here to begin\n\nfunction helloWorld() {\n  console.log("Welcome to Code Clarity AI!");\n}');
  
  // Settings States
  const [language, setLanguage] = useState(() => localStorage.getItem('defaultLang') || 'javascript');
  const [outputLanguage, setOutputLanguage] = useState(() => localStorage.getItem('defaultOutLang') || 'English');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  const [explanationResult, setExplanationResult] = useState('');
  const [projectName, setProjectName] = useState('Untitled Snippet');
  const [loading, setLoading] = useState(false);
  const [actionStep, setActionStep] = useState<string>('');
  
  const [mainView, setMainView] = useState<'home' | 'project' | 'history' | 'settings'>('home');
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const [init, setInit] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {};

  // Load history from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('ccai_history');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (error) {
        console.error("Failed to parse history:", error);
      }
    }
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

  // Sync Settings changes
  useEffect(() => { localStorage.setItem('defaultLang', language); }, [language]);
  useEffect(() => { localStorage.setItem('defaultOutLang', outputLanguage); }, [outputLanguage]);

  const saveHistory = (newProject: Project) => {
    let updatedProjects = [...projects];
    const existingIndex = updatedProjects.findIndex(p => p.id === newProject.id);
    
    if (existingIndex >= 0) {
      updatedProjects[existingIndex] = newProject;
    } else {
      updatedProjects = [newProject, ...updatedProjects];
    }
    
    setProjects(updatedProjects);
    localStorage.setItem('ccai_history', JSON.stringify(updatedProjects));
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to permanently delete all saved explanations?')) {
       setProjects([]);
       localStorage.removeItem('ccai_history');
    }
  };

  const handleAction = async (actionType: 'Explain' | 'Debug' | 'Refactor' | 'Generate') => {
    if (!inputCode.trim()) return;
    setLoading(true);
    
    setExplanationResult('');
    
    const stepsOptions = {
      'Explain': [
        "Analyzing Code Structure...",
        "Identifying Key Concepts...",
        "Breaking Down Logic Line-by-Line...",
        "Generating Beginner-Friendly Explanation..."
      ],
      'Debug': [
        "Scanning Logic & Errors...",
        "Tracing Execution Paths...",
        "Formulating Bug Fixes...",
        "Explaining Corrections Step-by-Step..."
      ],
      'Refactor': [
        "Analyzing Code Efficiency...",
        "Applying Best Practices...",
        "Optimizing Logic...",
        "Generating Cleaner Code with Explanations..."
      ],
      'Generate': [
        "Parsing Requirements...",
        "Drafting Logic Architecture...",
        "Writing Secure Syntax...",
        "Formatting Explanations..."
      ]
    };
    
    const steps = stepsOptions[actionType];
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setActionStep(steps[stepIndex]);
        stepIndex++;
      }
    }, 1500);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputCode,
          language,
          outputLanguage,
          actionType,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const text = data.result || '';
      
      clearInterval(stepInterval);
      setActionStep(`${actionType} Complete`);
      setExplanationResult(text);

      const projectData: Project = {
        id: currentProject?.id || Date.now().toString(),
        name: projectName || 'Untitled Snippet',
        description: inputCode,
        language: language,
        outputLanguage: outputLanguage,
        scope: actionType,
        generatedCode: text,
        createdAt: currentProject?.createdAt || Date.now()
      };

      saveHistory(projectData);
      setCurrentProject(projectData);

      // Timeout allows smooth scrolling on mobile
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Action failed:", error);
      setActionStep('Operation Failed');
      setExplanationResult('Sorry, an error occurred while processing your request. Please ensure the backend server is running and try again.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(explanationResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    setProjectName(project.name);
    setInputCode(project.description || ''); 
    setExplanationResult(project.generatedCode || '');
    setLanguage(project.language || localStorage.getItem('defaultLang') || 'javascript');
    setOutputLanguage(project.outputLanguage || localStorage.getItem('defaultOutLang') || 'English');
    setMainView('project');
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setProjectName('New Snippet');
    setInputCode('');
    setExplanationResult('');
    setMainView('project');
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this snippet?')) {
      const updatedProjects = projects.filter(p => p.id !== id);
      setProjects(updatedProjects);
      localStorage.setItem('ccai_history', JSON.stringify(updatedProjects));
      if (currentProject?.id === id) {
        handleNewProject();
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden transition-colors duration-300 relative flex flex-col font-['Inter','Khmer_OS_Siemreap',sans-serif]">
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
      <div className="relative z-10 w-full flex-grow flex flex-col">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50">
        <div className="w-full max-w-[1920px] mx-auto px-4 xl:px-8 h-20 flex items-center justify-between">
          {/* Left: Logo & App Name with Continuous Animation */}
          <div className="flex items-center gap-6">
            <motion.div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setMainView('home')}
            >
              <motion.div 
                whileHover={{ rotate: 180, scale: 1.1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_25px_rgba(16,185,129,0.8)]"
              >
                <BrainCircuit className="w-5 h-5 text-white dark:text-zinc-900" />
              </motion.div>
              <div className="flex flex-col">
                <motion.span 
                  animate={{ 
                    color: ["#10b981", "#8b5cf6", "#3b82f6", "#10b981"]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="font-black text-xl md:text-2xl tracking-tighter text-zinc-900 dark:text-white leading-none uppercase"
                >
                  Code Clarity
                </motion.span>
                <span className="text-[10px] md:text-xs text-emerald-500 font-black mt-1 uppercase tracking-[0.2em]">
                  AI Assistant
                </span>
              </div>
            </motion.div>
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'project', label: 'Code Explainer', icon: Code2 },
              { id: 'history', label: 'Saved Explanations', icon: History },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMainView(item.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                  mainView === item.id 
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMainView('settings')}
              className={cn("p-2 rounded-lg transition-colors hidden md:block", mainView === 'settings' ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800')}
              title="Settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hidden md:block"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            className="lg:hidden border-t border-zinc-200 dark:border-white/5 bg-white/95 dark:bg-black/95 backdrop-blur-2xl overflow-hidden fixed top-20 left-0 right-0 z-40"
          >
            <div className="px-4 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500"
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span className="text-sm font-black uppercase tracking-widest">Theme</span>
                </button>
                <button
                  onClick={() => { setMainView('settings'); setIsMenuOpen(false); }}
                  className={cn("flex items-center justify-center gap-2 px-4 py-4 rounded-xl border", mainView === 'settings' ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500')}
                >
                  <Settings2 className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Settings</span>
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Home', icon: Home, onClick: () => { setMainView('home'); setIsMenuOpen(false); }, active: mainView === 'home' },
                  { label: 'Code Explainer', icon: Code2, onClick: () => { setMainView('project'); setIsMenuOpen(false); }, active: mainView === 'project' },
                  { label: 'Saved Explanations', icon: History, onClick: () => { setMainView('history'); setIsMenuOpen(false); }, active: mainView === 'history' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-4 w-full p-5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                      item.active 
                        ? "bg-emerald-500 text-black" 
                        : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 flex-grow w-full">
        <AnimatePresence mode="wait">
          {mainView === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12 py-2"
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
                  Made For Beginners
                </motion.div>
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase italic z-10 relative flex flex-col items-center sm:items-start">
                    <motion.span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-500 to-zinc-900 dark:from-white dark:via-zinc-400 dark:to-white inline-block pb-2">
                      Code Explainer
                    </motion.span>
                    <motion.span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-600 dark:from-emerald-400 dark:via-white dark:to-emerald-600 inline-block">
                      By AI for Beginners
                    </motion.span>
                  </h1>
                  <p className="text-lg md:text-2xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto z-10 relative">
                    Paste your code below and let our intelligent AI explain it line-by-line, debug issues, or refactor it into clean, best-practice syntax.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                  <button 
                    onClick={() => setMainView('project')}
                    className="group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-5 xl:py-6 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center gap-3"
                  >
                    <Zap className="w-5 h-5 fill-current" />
                    Start Learning
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Features Grid */}
              <div ref={featuresRef} className="space-y-12">
                <div className="text-center space-y-4 pt-10">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">Core Capabilities</h2>
                  <p className="text-2xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white uppercase italic">Everything you need to learn</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Line-by-Line Explanation',
                      desc: 'AI breaks down complex logic and syntax step-by-step for absolute beginners.',
                      icon: BrainCircuit,
                      color: 'text-emerald-500',
                      bg: 'bg-emerald-500/10'
                    },
                    {
                      title: 'Smart Debugging',
                      desc: 'Automatically parses error statements, identifies bugs, and provides fixed solutions with clear reasoning.',
                      icon: Bug,
                      color: 'text-red-500',
                      bg: 'bg-red-500/10'
                    },
                    {
                      title: 'Code Refactoring',
                      desc: 'Transforms inefficient code into clean architecture while explaining the best practices.',
                      icon: Wand2,
                      color: 'text-purple-500',
                      bg: 'bg-purple-500/10'
                    }
                  ].map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + (i * 0.1) }}
                      className="card-enterprise p-8 md:p-10 space-y-6 group hover:border-emerald-500/50 transition-all border-zinc-200/50 dark:border-white/5"
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
            </motion.div>
          ) : mainView === 'project' ? (
            <motion.div 
              key="project"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-[1920px] xl:px-8 mx-auto grid lg:grid-cols-2 gap-8 items-start pb-10"
            >
              {/* Left Column: Input Panel */}
              <div className="space-y-6 lg:sticky lg:top-20 min-w-0">
                <div className="card-enterprise p-4 md:p-5 space-y-4 border-zinc-200/50 dark:border-white/5 shadow-enterprise-lg h-[60vh] md:h-[80vh] flex flex-col">
                  {/* Settings Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <label className="text-xs font-black text-zinc-400 uppercase tracking-widest hidden md:block">Snippet Name</label>
                        <input 
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="Untitled Snippet"
                          className="input-enterprise w-full bg-zinc-50/50 dark:bg-black/20 border-zinc-200/50 dark:border-white/5 font-bold text-xs p-3 rounded-lg"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest hidden md:block">Code Language</label>
                        <CustomDropdown 
                          value={language}
                          options={LANGUAGES}
                          onChange={(val) => setLanguage(val)}
                          icon={FileCode}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest hidden md:block">Output Language</label>
                        <CustomDropdown 
                          value={outputLanguage}
                          options={OUTPUT_LANGUAGES}
                          onChange={(val) => setOutputLanguage(val)}
                          icon={Globe2}
                        />
                     </div>
                  </div>

                  {/* Code textarea Container (MVP Mode) */}
                  <div className="flex-1 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden border border-zinc-200/50 dark:border-white/10 relative mt-2 bg-white dark:bg-[#1e1e1e]">
                     <textarea
                        className="w-full h-full p-6 text-sm font-['JetBrains_Mono','Fira_Code',monospace] bg-transparent text-zinc-900 dark:text-zinc-100 resize-none outline-none custom-scrollbar leading-relaxed"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="Paste your code or logic prompt here..."
                        spellCheck={false}
                     />
                  </div>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 shrink-0">
                    <button 
                      onClick={() => handleAction('Generate')}
                      disabled={loading}
                      className="bg-blue-500 text-white font-bold py-3 md:py-4 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50 text-[10px] sm:text-xs md:text-[11px] tracking-wider uppercase"
                    >
                      <Sparkles className="w-4 h-4 hidden sm:block" /> Generate
                    </button>
                    <button 
                      onClick={() => handleAction('Explain')}
                      disabled={loading}
                      className="bg-emerald-500 text-white font-bold py-3 md:py-4 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50 text-[10px] sm:text-xs md:text-[11px] tracking-wider uppercase"
                    >
                      <BrainCircuit className="w-4 h-4 hidden sm:block" /> Explain
                    </button>
                    <button 
                      onClick={() => handleAction('Debug')}
                      disabled={loading}
                      className="bg-red-500 text-white font-bold py-3 md:py-4 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50 text-[10px] sm:text-xs md:text-[11px] tracking-wider uppercase"
                    >
                      <Bug className="w-4 h-4 hidden sm:block" /> Debug
                    </button>
                    <button 
                      onClick={() => handleAction('Refactor')}
                      disabled={loading}
                      className="bg-purple-500 text-white font-bold py-3 md:py-4 px-2 sm:px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors disabled:opacity-50 text-[10px] sm:text-xs md:text-[11px] tracking-wider uppercase"
                    >
                      <Wand2 className="w-4 h-4 hidden sm:block" /> Refactor
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Output */}
              <div className="space-y-6">
                <div 
                  ref={resultRef}
                  className="card-enterprise h-[60vh] md:h-[80vh] flex flex-col border-zinc-200/50 dark:border-white/5 relative overflow-hidden bg-white dark:bg-zinc-950/50"
                >
                  <div className="p-4 border-b border-zinc-200/50 dark:border-white/5 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-500/50" />
                      <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                        AI Explanation Output
                      </span>
                    </div>
                    {explanationResult && (
                       <button 
                        onClick={copyToClipboard}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-emerald-500 transition-colors"
                       >
                         {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                       </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar relative">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-6">
                         <div className="relative">
                            <div className="w-16 h-16 border-4 border-zinc-200 dark:border-zinc-800 rounded-full" />
                            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                            <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500 animate-pulse" />
                         </div>
                         <div className="text-center space-y-2">
                           <div className="text-emerald-500 font-black uppercase tracking-widest text-sm animate-pulse">
                              Processing
                           </div>
                           <div className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                             {actionStep}
                           </div>
                         </div>
                      </div>
                    ) : explanationResult ? (
                      <div className="prose prose-zinc dark:prose-invert max-w-none 
                         prose-headings:font-black prose-headings:tracking-tight 
                         prose-h2:text-emerald-500 prose-h2:border-b-2 prose-h2:border-emerald-500/20 prose-h2:pb-2 prose-h2:mb-6
                         prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed prose-p:font-medium text-[15px]
                         prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl prose-pre:shadow-2xl prose-pre:text-sm prose-pre:overflow-x-auto
                         prose-code:text-emerald-600 dark:prose-code:text-emerald-400 prose-code:font-bold prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                         prose-strong:text-zinc-900 dark:prose-strong:text-white prose-strong:font-black
                         prose-li:text-zinc-700 dark:prose-li:text-zinc-300 prose-li:font-medium">
                        <Markdown>{explanationResult}</Markdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
                         <Terminal className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
                         <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs text-center max-w-[200px]">
                           No Assessment Yet.<br />Paste logic & hit action.
                         </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : mainView === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">Saved <span className="text-emerald-500">Explanations</span></h2>
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">Your past logic explanations and insights</p>
                </div>
                <button 
                  onClick={handleNewProject}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest text-sm rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-5 h-5" /> New Snippet
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="card-enterprise p-12 text-center space-y-4 border-dashed border-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <History className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">No Saved Explanations</h3>
                  <p className="text-zinc-500 text-sm font-medium">Start explaining code to build your history locally.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projects.map((project) => (
                    <div 
                      key={project.id}
                      onClick={() => selectProject(project)}
                      className="card-enterprise p-6 cursor-pointer group hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors shrink-0">
                          <Code2 className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-black text-lg text-zinc-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                            {project.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest text-zinc-500 mt-2">
                            <span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5" /> Code: {project.language || 'Unknown'}</span>
                            <span className="flex items-center gap-1.5 text-blue-500"><Terminal className="w-3.5 h-3.5" /> Action: {project.scope || 'Explain'}</span>
                            <span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5" /> Output: {project.outputLanguage || 'English'}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 
                              {new Date(project.createdAt).toLocaleDateString() || 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleDeleteProject(e, project.id!)}
                          className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <ChevronRight className="w-6 h-6 text-zinc-400 hidden sm:block" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : mainView === 'settings' ? (
             <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">Global <span className="text-emerald-500">Settings</span></h2>
                <p className="text-zinc-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-1">Configure your Code Clarity AI experience</p>
              </div>

              <div className="card-enterprise p-6 md:p-10 space-y-8">
                 
                 {/* Theme Settings */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
                    <div>
                       <h3 className="text-base md:text-lg font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2"><Sun className="w-5 h-5 text-zinc-400" /> Appearance Theme</h3>
                       <p className="text-[10px] md:text-xs font-bold text-zinc-500 mt-2 leading-relaxed max-w-sm">Toggle between light or dark mode globally. The theme applies instantly and is saved to your browser securely.</p>
                    </div>
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="px-6 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white transition-colors border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500"
                    >
                      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      {darkMode ? 'Switch Light' : 'Switch Dark'}
                    </button>
                 </div>
                 
                 {/* Default Code Language Setting */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
                    <div>
                       <h3 className="text-base md:text-lg font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2"><Code2 className="w-5 h-5 text-emerald-500" /> Default Code Language</h3>
                       <p className="text-[10px] md:text-xs font-bold text-zinc-500 mt-2 leading-relaxed max-w-sm">Select the programming language you use most often. New snippets will default to this language automatically.</p>
                    </div>
                    <div className="w-full md:w-64">
                       <CustomDropdown 
                          value={language}
                          options={LANGUAGES}
                          onChange={(val) => setLanguage(val)}
                          icon={FileCode}
                       />
                    </div>
                 </div>

                 {/* Default Output Language Setting */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
                    <div>
                       <h3 className="text-base md:text-lg font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2"><Globe2 className="w-5 h-5 text-blue-500" /> Default Output Language</h3>
                       <p className="text-[10px] md:text-xs font-bold text-zinc-500 mt-2 leading-relaxed max-w-sm">Select your preferred human language for the AI Explanation output. Your responses will always be generated in this language.</p>
                    </div>
                    <div className="w-full md:w-64">
                       <CustomDropdown 
                          value={outputLanguage}
                          options={OUTPUT_LANGUAGES}
                          onChange={(val) => setOutputLanguage(val)}
                          icon={Globe2}
                       />
                    </div>
                 </div>

                 {/* Application Info */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
                    <div>
                       <h3 className="text-base md:text-lg font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-purple-500" /> Application Version</h3>
                       <p className="text-[10px] md:text-xs font-bold text-zinc-500 mt-2 leading-relaxed max-w-sm">Current software build deployed on system architecture strictly conforming to Project Requirements.</p>
                    </div>
                    <div className="text-left md:text-right">
                       <span className="inline-block px-5 py-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black tracking-[0.2em] text-sm rounded-xl border border-purple-500/20 uppercase">
                          Version 1.0.0
                       </span>
                    </div>
                 </div>

                 {/* Data Control */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between pt-2 gap-4">
                    <div>
                       <h3 className="text-base md:text-lg font-black uppercase text-red-500 flex items-center gap-2"><Trash className="w-5 h-5" /> Danger Zone</h3>
                       <p className="text-[10px] md:text-xs font-bold text-zinc-500 mt-2 leading-relaxed max-w-sm">Permanently delete all your local history. This action cannot be reversed and all saved snippets will be lost.</p>
                    </div>
                    <div className="text-left md:text-right">
                       <button 
                         onClick={clearHistory}
                         disabled={projects.length === 0}
                         className="px-6 py-4 bg-red-500/10 text-red-500 font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/20"
                       >
                         Wipe All Local History
                       </button>
                    </div>
                 </div>

              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      
      {/* Footer reduced height and updated font */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-6 flex flex-col md:flex-row items-center content-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <BrainCircuit className="w-5 h-5 text-emerald-500" />
             <span className="font-black text-sm tracking-tight uppercase text-zinc-900 dark:text-white">Code Clarity AI</span>
          </div>
          <div className="text-xs md:text-sm font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-widest">
            &copy; {new Date().getFullYear()} Code Explainer AI. For Beginners by AI.
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

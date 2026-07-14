import {
  Layers, LayoutTemplate, Code, Cpu, Rocket, Sparkles, Lightbulb,
  BarChart2, BarChart3, TrendingUp, PieChart, DollarSign, Palette,
  Smartphone, Terminal, Bug, Gamepad2, Trophy, GitBranch, Workflow,
  Compass, BookOpen, GraduationCap, Calculator, CheckSquare, ListTodo,
  Calendar, Target, Users, Shield, Zap, Heart, Star, Flame, Briefcase,
  Globe, Database, Cloud, Lock, FolderKanban, PenTool, Network, Share2,
  Brain, Activity, Hexagon, Box, Grid, Aperture, Feather, Command, Layout
} from 'lucide-react';

const PALETTES = [
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #8b5cf6, #a855f7)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #6366f1, #ec4899)',
  'linear-gradient(135deg, #14b8a6, #3b82f6)',
  'linear-gradient(135deg, #f97316, #eab308)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #d946ef, #8b5cf6)',
];

const DETERMINISTIC_ICONS = [
  Layers, Hexagon, Box, Grid, Aperture, Feather, Command, Zap,
  Shield, Flame, Globe, Activity, Compass, Rocket, Briefcase,
];

/**
 * Automatically generates a meaningful icon and harmonious gradient theme
 * based on keywords inside the board title or room code.
 */
export function getBoardTheme(titleOrCode = '') {
  const str = String(titleOrCode || '').trim();
  const lower = str.toLowerCase();

  // 1. Design / UI / UX / Wireframe / Graphics
  if (/\b(ui|ux|wireframe|design|layout|mockup|sketch|art|color|palette|draw|paint|prototype|canvas)\b/.test(lower)) {
    return {
      icon: lower.includes('wireframe') || lower.includes('layout') ? LayoutTemplate : lower.includes('mobile') || lower.includes('app') ? Smartphone : Palette,
      color: 'linear-gradient(135deg, #ec4899, #f43f5e)',
      label: 'Design & UI',
    };
  }

  // 2. Brainstorming / Ideas / Mindmap / Concept / Strategy
  if (/\b(brainstorm|idea|mindmap|concept|think|note|vision|strategy|innovation|creative|notes)\b/.test(lower)) {
    return {
      icon: lower.includes('mindmap') || lower.includes('network') ? Network : lower.includes('idea') || lower.includes('brain') ? Lightbulb : Sparkles,
      color: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
      label: 'Brainstorm',
    };
  }

  // 3. Engineering / Code / Architecture / Systems / API / Bugs
  if (/\b(code|dev|tech|architecture|api|system|backend|frontend|bug|test|testing|app|software|server|cloud|db|database|react|node|python|git|compiler)\b/.test(lower)) {
    return {
      icon: lower.includes('architecture') || lower.includes('flow') || lower.includes('system') ? Cpu : lower.includes('bug') || lower.includes('test') ? Bug : lower.includes('terminal') ? Terminal : Code,
      color: 'linear-gradient(135deg, #10b981, #06b6d4)',
      label: 'Engineering',
    };
  }

  // 4. Economics / Finance / Business / Sales / Marketing / Data / Analytics
  if (/\b(economics|finance|money|cost|budget|chart|data|stat|stats|market|sales|revenue|growth|kpi|metric|price|business|invest|portfolio)\b/.test(lower)) {
    return {
      icon: lower.includes('chart') || lower.includes('stats') || lower.includes('data') ? BarChart3 : lower.includes('growth') || lower.includes('sales') || lower.includes('market') ? TrendingUp : lower.includes('budget') || lower.includes('cost') || lower.includes('money') ? DollarSign : PieChart,
      color: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      label: 'Data & Finance',
    };
  }

  // 5. Project Management / Agile / Roadmap / Sprints / Planning / Tasks / Retros
  if (/\b(roadmap|sprint|agile|kanban|todo|task|plan|planning|project|scrum|tracker|milestone|goal|retrospective|retro)\b/.test(lower)) {
    return {
      icon: lower.includes('roadmap') || lower.includes('sprint') || lower.includes('retro') ? Rocket : lower.includes('todo') || lower.includes('task') ? CheckSquare : lower.includes('calendar') || lower.includes('schedule') ? Calendar : FolderKanban,
      color: 'linear-gradient(135deg, #3b82f6, #6366f1)',
      label: 'Management & Planning',
    };
  }

  // 6. Education / Study / School / Science / Math / Research / Lecture
  if (/\b(school|study|math|physics|chemistry|biology|science|lecture|book|class|exam|research|thesis|learn|course)\b/.test(lower)) {
    return {
      icon: lower.includes('math') || lower.includes('calc') ? Calculator : lower.includes('science') || lower.includes('physics') ? Compass : BookOpen,
      color: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
      label: 'Education & Research',
    };
  }

  // 7. Gaming / Fun / Entertainment / Social / Team Building
  if (/\b(game|play|fun|party|trivia|quiz|music|video|chat|social|friend|team)\b/.test(lower)) {
    return {
      icon: lower.includes('game') || lower.includes('play') ? Gamepad2 : lower.includes('team') || lower.includes('friend') ? Users : Trophy,
      color: 'linear-gradient(135deg, #f97316, #ec4899)',
      label: 'Gaming & Social',
    };
  }

  // 8. Security / Admin / Private / Vault / Ops
  if (/\b(security|admin|private|vault|ops|secret|shield|auth|pass|keys)\b/.test(lower)) {
    return {
      icon: Shield,
      color: 'linear-gradient(135deg, #06b6d4, #6366f1)',
      label: 'Security & Ops',
    };
  }

  // Deterministic fallback based on title/code hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);

  return {
    icon: DETERMINISTIC_ICONS[absHash % DETERMINISTIC_ICONS.length],
    color: PALETTES[absHash % PALETTES.length],
    label: 'Workspace',
  };
}

// ============================================================================
// Boardroom Pro — High-Fidelity One-Click Template Starters
// Generates stunning, premium domain cards with custom headers, subtitles,
// and clean divider lines for students, teachers, and programmers.
// ============================================================================

function fallbackUid(prefix = 'tpl') {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${rand}${time}`;
}

export function getTemplateSlugFromRoomCode(roomCode) {
  if (!roomCode || typeof roomCode !== 'string') return null;
  const lower = roomCode.toLowerCase();
  if (lower.includes('-lecture') || lower === 'lecture') return 'lecture';
  if (lower.includes('-studyplan') || lower === 'studyplan') return 'studyplan';
  if (lower.includes('-codeflow') || lower === 'codeflow') return 'codeflow';
  if (lower.includes('-debug') || lower === 'debug') return 'debug';
  if (lower.includes('-groupwork') || lower === 'groupwork') return 'groupwork';
  if (lower.includes('-blank') || lower === 'blank') return 'blank';
  return null;
}

function createTopBanner(title, subtitle) {
  return [
    {
      type: 'rect',
      version: '6.0.0',
      id: fallbackUid('banner_bg'),
      pageId: 'page-1',
      left: 60,
      top: 40,
      width: 1160,
      height: 86,
      fill: '#0f172a',
      stroke: '#334155',
      strokeWidth: 2,
      rx: 18,
      ry: 18,
      selectable: false,
    },
    {
      type: 'i-text',
      version: '6.0.0',
      id: fallbackUid('banner_title'),
      pageId: 'page-1',
      left: 96,
      top: 58,
      text: title,
      fontSize: 22,
      fontWeight: 'bold',
      fill: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      selectable: true,
    },
    {
      type: 'i-text',
      version: '6.0.0',
      id: fallbackUid('banner_sub'),
      pageId: 'page-1',
      left: 96,
      top: 90,
      text: subtitle,
      fontSize: 13,
      fontWeight: 'normal',
      fill: '#94a3b8',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      selectable: true,
    },
  ];
}

function createDomainCard({ left, top, width, height, title, subtitle, headerFill, accentBorder }) {
  return [
    // 1. Outer Card Background
    {
      type: 'rect',
      version: '6.0.0',
      id: fallbackUid('card_outer'),
      pageId: 'page-1',
      left,
      top,
      width,
      height,
      fill: '#ffffff',
      stroke: accentBorder,
      strokeWidth: 2,
      rx: 20,
      ry: 20,
      selectable: false,
    },
    // 2. Inner Header Pill
    {
      type: 'rect',
      version: '6.0.0',
      id: fallbackUid('card_header'),
      pageId: 'page-1',
      left: left + 16,
      top: top + 16,
      width: width - 32,
      height: 48,
      fill: headerFill,
      stroke: 'transparent',
      strokeWidth: 0,
      rx: 12,
      ry: 12,
      selectable: false,
    },
    // 3. Header Title Text inside Pill
    {
      type: 'i-text',
      version: '6.0.0',
      id: fallbackUid('card_title'),
      pageId: 'page-1',
      left: left + 36,
      top: top + 30,
      text: title,
      fontSize: 17,
      fontWeight: 'bold',
      fill: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      selectable: true,
    },
    // 4. Subtitle Helper Line below Pill
    {
      type: 'i-text',
      version: '6.0.0',
      id: fallbackUid('card_subtitle'),
      pageId: 'page-1',
      left: left + 28,
      top: top + 78,
      text: subtitle,
      fontSize: 13,
      fontWeight: 'normal',
      fill: '#64748b',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      selectable: true,
    },
    // 5. Divider Line separating Header Area from Open Workspace
    {
      type: 'line',
      version: '6.0.0',
      id: fallbackUid('card_divider'),
      pageId: 'page-1',
      x1: left + 20,
      y1: top + 108,
      x2: left + width - 20,
      y2: top + 108,
      stroke: '#e2e8f0',
      strokeWidth: 1.5,
      selectable: false,
    },
  ];
}

export function getTemplateStarterObjects(templateSlug) {
  if (!templateSlug || templateSlug === 'blank') return [];

  switch (templateSlug) {
    case 'lecture': {
      return [
        ...createTopBanner(
          '👨‍🏫 Interactive Classroom Lecture & Q&A · Live Academic Whiteboard',
          'Workspace optimized for real-time concept teaching and collaborative student doubt solving'
        ),
        ...createDomainCard({
          left: 60,
          top: 150,
          width: 730,
          height: 570,
          title: "👨‍🏫 Teacher's Whiteboard & Lecture Zone",
          subtitle: '✦ Sketch concepts, write formulas, draw diagrams, and lead classroom discussions below',
          headerFill: '#1e3a8a',
          accentBorder: '#3b82f6',
        }),
        ...createDomainCard({
          left: 810,
          top: 150,
          width: 410,
          height: 570,
          title: '🙋‍♂️ Student Q&A & Doubt Solver',
          subtitle: '✦ Students: drop questions or ask for clarifications here',
          headerFill: '#064e3b',
          accentBorder: '#10b981',
        }),
      ];
    }

    case 'studyplan': {
      return [
        ...createTopBanner(
          '📚 Student Exam & Semester Study Roadmap · Revision Dashboard',
          'Track priority subjects, daily practice goals, and syllabus completion milestones'
        ),
        ...createDomainCard({
          left: 60,
          top: 150,
          width: 360,
          height: 570,
          title: '📌 Priority Subjects & Syllabus',
          subtitle: '✦ List key chapters, weightage & exam dates',
          headerFill: '#4c1d95',
          accentBorder: '#8b5cf6',
        }),
        ...createDomainCard({
          left: 460,
          top: 150,
          width: 360,
          height: 570,
          title: '📝 Daily Revision & Practice',
          subtitle: '✦ Active study goals and mock test trackers',
          headerFill: '#78350f',
          accentBorder: '#f59e0b',
        }),
        ...createDomainCard({
          left: 860,
          top: 150,
          width: 360,
          height: 570,
          title: '✅ Completed & Exam Ready',
          subtitle: '✦ Fully mastered chapters and formula notes',
          headerFill: '#14532d',
          accentBorder: '#22c55e',
        }),
      ];
    }

    case 'codeflow': {
      return [
        ...createTopBanner(
          '⚡ Algorithm & Code Logic Flowchart · System Wiring & Data Structures',
          'Map out program logic, API structures, control flows, and edge cases before writing code'
        ),
        ...createDomainCard({
          left: 60,
          top: 150,
          width: 360,
          height: 570,
          title: '📥 Inputs & Data Structures',
          subtitle: '✦ Define schemas, parameters, types & state',
          headerFill: '#1e3a8a',
          accentBorder: '#3b82f6',
        }),
        ...createDomainCard({
          left: 460,
          top: 150,
          width: 360,
          height: 570,
          title: '⚙️ Processing & Core Logic',
          subtitle: '✦ Algorithm steps, loops & transformations',
          headerFill: '#4c1d95',
          accentBorder: '#8b5cf6',
        }),
        ...createDomainCard({
          left: 860,
          top: 150,
          width: 360,
          height: 570,
          title: '📤 Output & Error Handling',
          subtitle: '✦ Return values, exceptions & fallback states',
          headerFill: '#064e3b',
          accentBorder: '#10b981',
        }),
      ];
    }

    case 'debug': {
      return [
        ...createTopBanner(
          '🐞 Collaborative Debugging & Code Walkthrough · Root Cause Analysis',
          'Inspect buggy code snippets, trace stack traces, and document peer-reviewed solutions'
        ),
        ...createDomainCard({
          left: 60,
          top: 150,
          width: 560,
          height: 570,
          title: '🐞 Bug Description & Stack Trace',
          subtitle: '✦ Paste error logs, reproduction steps & faulty code snippets',
          headerFill: '#7f1d1d',
          accentBorder: '#ef4444',
        }),
        ...createDomainCard({
          left: 645,
          top: 150,
          width: 575,
          height: 570,
          title: '🔍 Root Cause & Proposed Solution',
          subtitle: '✦ Document the fix, variable state traces & code review notes',
          headerFill: '#064e3b',
          accentBorder: '#10b981',
        }),
      ];
    }

    case 'groupwork': {
      return [
        ...createTopBanner(
          '🎯 Student Group Project Workspace · Collaboration & Final Deliverables',
          'Coordinate task assignments, organize research links, and prepare team presentations'
        ),
        ...createDomainCard({
          left: 60,
          top: 150,
          width: 560,
          height: 275,
          title: '📌 Project Topic & Guidelines',
          subtitle: '✦ Rubric requirements, deadlines & key milestones',
          headerFill: '#1e3a8a',
          accentBorder: '#3b82f6',
        }),
        ...createDomainCard({
          left: 645,
          top: 150,
          width: 575,
          height: 275,
          title: '👥 Task Assignments & Roles',
          subtitle: '✦ Who is doing what across research, writing & design',
          headerFill: '#4c1d95',
          accentBorder: '#8b5cf6',
        }),
        ...createDomainCard({
          left: 60,
          top: 445,
          width: 560,
          height: 275,
          title: '🔍 Research & Reference Links',
          subtitle: '✦ Articles, citations, papers & data sources',
          headerFill: '#78350f',
          accentBorder: '#f59e0b',
        }),
        ...createDomainCard({
          left: 645,
          top: 445,
          width: 575,
          height: 275,
          title: '💡 Presentation & Deliverables',
          subtitle: '✦ Slide outlines, draft notes & final submission checklist',
          headerFill: '#064e3b',
          accentBorder: '#10b981',
        }),
      ];
    }

    default:
      return [];
  }
}

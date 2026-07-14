// ============================================================================
// Boardroom Pro — One-Click Professional Template Starters for Students, Teachers & Programmers
// Generates clean, spacious domain containers with titles matching each
// template name, without pre-filled text or clutter inside.
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

export function getTemplateStarterObjects(templateSlug) {
  if (!templateSlug || templateSlug === 'blank') return [];

  const createTitleBar = (titleText) => [
    {
      type: 'rect',
      version: '6.0.0',
      id: fallbackUid('banner_bg'),
      pageId: 'page-1',
      left: 60,
      top: 40,
      width: 1160,
      height: 70,
      fill: '#f8fafc',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      rx: 14,
      ry: 14,
      selectable: false,
    },
    {
      type: 'i-text',
      version: '6.0.0',
      id: fallbackUid('banner_text'),
      pageId: 'page-1',
      left: 95,
      top: 60,
      text: titleText,
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#0f172a',
      fontFamily: 'Inter, system-ui, sans-serif',
      selectable: true,
    },
  ];

  switch (templateSlug) {
    case 'lecture': {
      return [
        ...createTitleBar('👨‍🏫 Interactive Classroom Lecture & Q&A · Live Teaching Board'),
        // Domain 1: Teacher's Whiteboard Zone
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_teach'),
          pageId: 'page-1',
          left: 60,
          top: 135,
          width: 720,
          height: 560,
          fill: '#eff6ff',
          stroke: '#3b82f6',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_teach'),
          pageId: 'page-1',
          left: 85,
          top: 160,
          text: "👨‍🏫 Teacher's Lecture & Whiteboard Zone",
          fontSize: 20,
          fontWeight: 'bold',
          fill: '#1d4ed8',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 2: Student Q&A Zone
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_qa'),
          pageId: 'page-1',
          left: 810,
          top: 135,
          width: 410,
          height: 560,
          fill: '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_qa'),
          pageId: 'page-1',
          left: 835,
          top: 160,
          text: '🙋‍♂️ Student Questions & Doubt Solver',
          fontSize: 20,
          fontWeight: 'bold',
          fill: '#047857',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },
      ];
    }

    case 'studyplan': {
      return [
        ...createTitleBar('📚 Student Exam & Semester Study Roadmap · Revision Goals'),
        // Domain 1: High Priority Subjects
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('col_sub'),
          pageId: 'page-1',
          left: 60,
          top: 135,
          width: 360,
          height: 560,
          fill: '#f3e8ff',
          stroke: '#8b5cf6',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('title_sub'),
          pageId: 'page-1',
          left: 85,
          top: 160,
          text: '📌 High Priority Subjects & Syllabus',
          fontSize: 19,
          fontWeight: 'bold',
          fill: '#6b21a8',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 2: Daily Revision & Practice Goals
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('col_goals'),
          pageId: 'page-1',
          left: 460,
          top: 135,
          width: 360,
          height: 560,
          fill: '#fffbeb',
          stroke: '#f59e0b',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('title_goals'),
          pageId: 'page-1',
          left: 485,
          top: 160,
          text: '📝 Daily Revision & Practice Goals',
          fontSize: 19,
          fontWeight: 'bold',
          fill: '#b45309',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 3: Completed & Exam Ready
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('col_done'),
          pageId: 'page-1',
          left: 860,
          top: 135,
          width: 360,
          height: 560,
          fill: '#f0fdf4',
          stroke: '#22c55e',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('title_done'),
          pageId: 'page-1',
          left: 885,
          top: 160,
          text: '✅ Completed & Exam Ready',
          fontSize: 19,
          fontWeight: 'bold',
          fill: '#15803d',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },
      ];
    }

    case 'codeflow': {
      return [
        ...createTitleBar('⚡ Algorithm & Code Logic Flowchart · Data & Control Flow'),
        // Domain 1: Inputs & Data Structures
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_in'),
          pageId: 'page-1',
          left: 60,
          top: 135,
          width: 360,
          height: 560,
          fill: '#eff6ff',
          stroke: '#3b82f6',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_in'),
          pageId: 'page-1',
          left: 85,
          top: 160,
          text: '📥 Inputs & Data Structures',
          fontSize: 19,
          fontWeight: 'bold',
          fill: '#1d4ed8',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 2: Processing & Core Logic
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_proc'),
          pageId: 'page-1',
          left: 460,
          top: 135,
          width: 360,
          height: 560,
          fill: '#f3e8ff',
          stroke: '#8b5cf6',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_proc'),
          pageId: 'page-1',
          left: 485,
          top: 160,
          text: '⚙️ Processing & Core Logic',
          fontSize: 19,
          fontWeight: 'bold',
          fill: '#6b21a8',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 3: Output & Error Handling
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_out'),
          pageId: 'page-1',
          left: 860,
          top: 135,
          width: 360,
          height: 560,
          fill: '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_out'),
          pageId: 'page-1',
          left: 885,
          top: 160,
          text: '📤 Output & Error Handling',
          fontSize: 19,
          fontWeight: 'bold',
          fill: '#047857',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },
      ];
    }

    case 'debug': {
      return [
        ...createTitleBar('🐞 Collaborative Debugging & Code Walkthrough · Root Cause Analysis'),
        // Domain 1: Bug Description & Stack Trace
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_bug'),
          pageId: 'page-1',
          left: 60,
          top: 135,
          width: 550,
          height: 560,
          fill: '#fef2f2',
          stroke: '#ef4444',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_bug'),
          pageId: 'page-1',
          left: 85,
          top: 160,
          text: '🐞 Bug Description & Stack Trace',
          fontSize: 20,
          fontWeight: 'bold',
          fill: '#b91c1c',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 2: Root Cause & Proposed Fix
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('box_fix'),
          pageId: 'page-1',
          left: 640,
          top: 135,
          width: 580,
          height: 560,
          fill: '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('txt_fix'),
          pageId: 'page-1',
          left: 665,
          top: 160,
          text: '🔍 Root Cause & Proposed Fix',
          fontSize: 20,
          fontWeight: 'bold',
          fill: '#047857',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },
      ];
    }

    case 'groupwork': {
      return [
        ...createTitleBar('🎯 Student Group Project Workspace · Collaboration & Deliverables'),
        // Domain 1: Project Topic & Guidelines
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('q1_top'),
          pageId: 'page-1',
          left: 60,
          top: 135,
          width: 550,
          height: 275,
          fill: '#eff6ff',
          stroke: '#3b82f6',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('q1_txt'),
          pageId: 'page-1',
          left: 85,
          top: 160,
          text: '📌 Project Topic & Guidelines',
          fontSize: 18,
          fontWeight: 'bold',
          fill: '#1d4ed8',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 2: Task Assignments & Roles
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('q2_top'),
          pageId: 'page-1',
          left: 640,
          top: 135,
          width: 550,
          height: 275,
          fill: '#f3e8ff',
          stroke: '#8b5cf6',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('q2_txt'),
          pageId: 'page-1',
          left: 665,
          top: 160,
          text: '👥 Task Assignments & Roles',
          fontSize: 18,
          fontWeight: 'bold',
          fill: '#6b21a8',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 3: Research & Reference Links
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('q3_bot'),
          pageId: 'page-1',
          left: 60,
          top: 430,
          width: 550,
          height: 275,
          fill: '#fffbeb',
          stroke: '#f59e0b',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('q3_txt'),
          pageId: 'page-1',
          left: 85,
          top: 455,
          text: '🔍 Research & Reference Links',
          fontSize: 18,
          fontWeight: 'bold',
          fill: '#b45309',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },

        // Domain 4: Presentation & Deliverables
        {
          type: 'rect',
          version: '6.0.0',
          id: fallbackUid('q4_bot'),
          pageId: 'page-1',
          left: 640,
          top: 430,
          width: 550,
          height: 275,
          fill: '#ecfdf5',
          stroke: '#10b981',
          strokeWidth: 2,
          rx: 16,
          ry: 16,
          selectable: false,
        },
        {
          type: 'i-text',
          version: '6.0.0',
          id: fallbackUid('q4_txt'),
          pageId: 'page-1',
          left: 665,
          top: 455,
          text: '💡 Presentation & Deliverables',
          fontSize: 18,
          fontWeight: 'bold',
          fill: '#047857',
          fontFamily: 'Inter, system-ui, sans-serif',
          selectable: true,
        },
      ];
    }

    default:
      return [];
  }
}

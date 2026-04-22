import React from 'react';

const TEAL = '#00C9B1';
const BLUE = '#1A73E8';

const PHASES = [
  {
    num: '01',
    status: 'current',
    label: 'Now Live',
    title: 'Agentic RAG Platform',
    subtitle: 'The foundation — document intelligence at its core',
    color: TEAL,
    items: [
      { title: 'Custom AI Agents', desc: 'Create isolated agents with their own knowledge base, name, and instructions. Each agent is fully independent.' },
      { title: 'Document Ingestion', desc: 'Upload PDF, DOCX, or TXT. Archelon parses, chunks, embeds, and indexes everything automatically.' },
      { title: 'Agentic RAG Pipeline', desc: 'Intent classification, multi-query retrieval, gap detection, reranking, and grounded synthesis — all in one pipeline.' },
      { title: 'Embed Widget', desc: 'Generate an API key, whitelist your domain, paste one script tag. Your agent is live on any website.' },
      { title: 'Token Metering', desc: 'Every query and upload is tracked. See usage per agent, per session, and remaining quota in real time.' },
    ],
  },
  {
    num: '02',
    status: 'building',
    label: 'In Progress',
    title: 'Gmail & WhatsApp Agents',
    subtitle: 'Your agent works 24/7 — in your inbox and on WhatsApp',
    color: BLUE,
    items: [
      { title: 'Gmail Agent', desc: 'Your agent monitors your inbox around the clock. It reads inbound emails, understands context, and drafts or sends replies grounded in your documents — no human needed for routine queries.', highlight: true },
      { title: 'WhatsApp Agent', desc: 'Same intelligence, on WhatsApp. Customers message you, your agent responds instantly with accurate, document-grounded answers.', highlight: true },
      { title: 'Inbound Automation', desc: 'Route, classify, and respond to messages across channels without lifting a finger.' },
      { title: 'Channel Dashboard', desc: 'See all connected channels, message volumes, and agent activity in one unified view.' },
    ],
  },
  {
    num: '03',
    status: 'horizon',
    label: 'Coming Next',
    title: 'Multi-Agent Teams & Tool Calling',
    subtitle: 'Agents that collaborate, escalate, and act on real systems',
    color: TEAL,
    items: [
      { title: 'Agent Teams', desc: 'Build a team of agents that work together. Example: Sales Agent (Jack) drafts a proposal, Compliance Agent (Jill) reviews it. Rejected twice? It escalates to you as owner.', highlight: true },
      { title: 'Tool-Calling Agents', desc: 'Agents connected to your systems. Example: an e-commerce agent checks delayed deliveries daily and automatically sends personalised apology emails with a 30% coupon code.', highlight: true },
      { title: 'Escalation Logic', desc: 'Define approval chains, rejection thresholds, and human-in-the-loop triggers for any workflow.' },
      { title: 'DB & API Connectors', desc: 'Connect agents to databases, REST APIs, and internal tools so they can read and act on real data.' },
      { title: 'Scheduled Agents', desc: 'Agents that run on a schedule — daily reports, proactive outreach, automated monitoring.' },
    ],
  },
];

function RoadmapView() {
  return (
    <div className="h-[calc(100vh-57px)] overflow-y-auto">
      <div className="relative min-h-full">

        {/* Marine background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 10% 30%, rgba(0,201,177,0.06) 0%, transparent 50%), radial-gradient(ellipse at 90% 70%, rgba(26,115,232,0.05) 0%, transparent 50%)',
          }} />
          <svg width="100%" height="100%" style={{ opacity: 0.018, position: 'absolute' }}>
            <defs>
              <pattern id="rm-hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={TEAL} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#rm-hex)" />
          </svg>
          {/* Wave lines */}
          <svg width="100%" height="100%" style={{ opacity: 0.035, position: 'absolute' }} preserveAspectRatio="none">
            <path d="M0,300 Q500,270 1000,300 Q1500,330 2000,300" stroke={TEAL} strokeWidth="1.5" fill="none" />
            <path d="M0,500 Q500,470 1000,500 Q1500,530 2000,500" stroke={BLUE} strokeWidth="1" fill="none" />
          </svg>
        </div>

        <div className="relative w-full max-w-[1200px] mx-auto px-8 py-10">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: TEAL }}>Product Roadmap</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">The Archelon Voyage</h1>
            <p className="text-base text-gray-500 dark:text-gray-400">Three destinations. One journey. Click an island to explore.</p>
          </div>

          {/* ── Alternating detail rows ── */}
          <div className="space-y-16">
            {PHASES.map((p, i) => {
              const isRight = i % 2 === 0; // 01 detail right, 02 detail left, 03 detail right
              const isHorizon = p.status === 'horizon';

              return (
                <div key={i} className={`flex gap-10 items-start ${isRight ? 'flex-row' : 'flex-row-reverse'}`}>

                  {/* Island visual side */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-3" style={{ width: 200 }}>
                    <div
                      className="w-40 h-40 rounded-full flex items-center justify-center relative"
                      style={{
                        background: `radial-gradient(circle, ${p.color}18 0%, ${p.color}06 60%, transparent 100%)`,
                        border: `2px solid ${p.color}30`,
                        opacity: isHorizon ? 0.6 : 1,
                      }}
                    >
                      {/* Reef rings */}
                      <div className="absolute inset-3 rounded-full" style={{ border: `1px dashed ${p.color}30` }} />
                      <div className="absolute inset-8 rounded-full" style={{ border: `1px solid ${p.color}20` }} />
                      {/* Content */}
                      {p.status === 'current' ? (
                        <img src="/Archelon_logo.png" alt="Archelon" className="w-12 h-12 object-contain" style={{ filter: `drop-shadow(0 0 8px ${TEAL}80)` }} />
                      ) : (
                        <span className="text-4xl font-bold" style={{ color: p.color, opacity: 0.6 }}>{p.num}</span>
                      )}
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{ background: `${p.color}18`, color: p.color }}
                    >
                      {p.label}
                    </span>
                    {p.status === 'current' && (
                      <span className="flex items-center gap-1.5 text-xs text-green-500 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                        Live now
                      </span>
                    )}
                  </div>

                  {/* Detail side */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{p.title}</h2>
                      <p className="text-base text-gray-500 dark:text-gray-400">{p.subtitle}</p>
                    </div>

                    {/* Dotted divider */}
                    <div className="flex gap-1 my-4">
                      {Array.from({ length: 32 }).map((_, j) => (
                        <div key={j} className="h-px flex-1" style={{ background: `${p.color}${j % 2 === 0 ? '50' : '12'}` }} />
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {p.items.map((item, j) => (
                        <div
                          key={j}
                          className="rounded-xl px-4 py-3"
                          style={{
                            background: item.highlight ? `${p.color}0c` : 'rgba(128,128,128,0.04)',
                            border: `1px solid ${item.highlight ? `${p.color}35` : 'rgba(128,128,128,0.08)'}`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color, opacity: item.highlight ? 1 : 0.35 }} />
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.title}</p>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-12 pb-6 leading-relaxed">
            Roadmap reflects current direction and is subject to change based on user feedback and infrastructure priorities.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoadmapView;

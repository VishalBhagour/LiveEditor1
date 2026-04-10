import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Real-Time Sync',
    desc: 'Every keystroke synced instantly across all collaborators via WebSockets.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Monaco Editor',
    desc: 'The same engine powering VS Code — syntax highlighting for 10+ languages.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
      </svg>
    ),
    title: 'Role-Based Access',
    desc: 'Assign owners, editors, and viewers. Control who can type.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
    ),
    title: 'Auto-Save',
    desc: 'Code is debounced and persisted to MongoDB automatically.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'JWT Auth',
    desc: 'Secure token-based authentication. Protected rooms and routes.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Activity History',
    desc: 'Last 50 code snapshots stored per session for replay.',
  },
];

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'HTML'];

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg grid-pattern overflow-hidden">
      {/* Hero */}
      <section className="pt-32 pb-24 px-4 text-center relative">
        {/* Glow orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 status-pulse" />
            Real-time collaboration, zero friction
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Code together,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              ship faster.
            </span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            A professional collaborative code editor with real-time sync, role-based access,
            and Monaco — the engine that powers VS Code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup" className="btn-primary px-6 py-3 text-base font-semibold w-full sm:w-auto">
              Start coding free →
            </Link>
            <Link to="/login" className="btn-ghost px-6 py-3 text-base w-full sm:w-auto">
              Sign in
            </Link>
          </div>

          {/* Language pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {LANGUAGES.map((lang) => (
              <span key={lang} className="badge bg-gray-800 text-gray-400 border border-gray-700 px-3 py-1 text-xs font-mono">
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Mock editor preview */}
      <section className="max-w-5xl mx-auto px-4 mb-20">
        <div className="rounded-xl border border-gray-800 overflow-hidden shadow-2xl glow">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-gray-600 text-xs font-mono">main.js — Room A1B2C3D4</span>
            <div className="ml-auto flex items-center gap-2">
              {['#FF6B6B', '#4ECDC4', '#45B7D1'].map((color, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-gray-900 -ml-1"
                  style={{ backgroundColor: color }} title={`User ${i + 1}`} />
              ))}
              <span className="text-gray-500 text-xs ml-1">3 online</span>
            </div>
          </div>
          {/* Fake code */}
          <div className="bg-gray-950 p-6 font-mono text-sm leading-7 text-left overflow-x-auto">
            <div><span className="text-gray-600 select-none mr-6">1</span><span className="text-blue-400">const</span> <span className="text-green-400">express</span> <span className="text-gray-400">=</span> <span className="text-yellow-300">require</span><span className="text-gray-400">(</span><span className="text-orange-300">'express'</span><span className="text-gray-400">);</span></div>
            <div><span className="text-gray-600 select-none mr-6">2</span><span className="text-blue-400">const</span> <span className="text-green-400">app</span> <span className="text-gray-400">=</span> <span className="text-yellow-300">express</span><span className="text-gray-400">();</span></div>
            <div><span className="text-gray-600 select-none mr-6">3</span></div>
            <div><span className="text-gray-600 select-none mr-6">4</span><span className="text-gray-500">{'// ✨ Real-time route handler'}</span></div>
            <div><span className="text-gray-600 select-none mr-6">5</span><span className="text-green-400">app</span><span className="text-gray-400">.</span><span className="text-yellow-300">get</span><span className="text-gray-400">(</span><span className="text-orange-300">'/'</span><span className="text-gray-400">, (</span><span className="text-blue-300">req</span><span className="text-gray-400">, </span><span className="text-blue-300">res</span><span className="text-gray-400">) =&gt; {'{'}</span></div>
            <div><span className="text-gray-600 select-none mr-6">6</span><span className="text-gray-400 ml-8"></span><span className="text-blue-300">res</span><span className="text-gray-400">.</span><span className="text-yellow-300">json</span><span className="text-gray-400">({'{'} </span><span className="text-green-300">status</span><span className="text-gray-400">: </span><span className="text-orange-300">'🚀 Live!'</span><span className="text-gray-400"> {'}'});</span></div>
            <div><span className="text-gray-600 select-none mr-6">7</span><span className="text-gray-400">{'}'});</span></div>
            <div className="relative"><span className="text-gray-600 select-none mr-6">8</span><span className="text-green-400">app</span><span className="text-gray-400">.</span><span className="text-yellow-300">listen</span><span className="text-gray-400">(</span><span className="text-purple-400">5000</span><span className="text-gray-400">);</span><span className="inline-block w-0.5 h-5 bg-blue-400 ml-0.5 animate-pulse align-text-bottom" /></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="font-display text-3xl font-bold text-center text-white mb-3">
          Everything you need to collaborate
        </h2>
        <p className="text-gray-500 text-center mb-12">Built for developers who move fast.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card hover:border-gray-700 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:border-blue-500/40 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-display font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800 py-20 text-center">
        <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to collaborate?</h2>
        <p className="text-gray-500 mb-8">Create a room and share the link. That's it.</p>
        <Link to="/signup" className="btn-primary px-8 py-3 text-base inline-block">
          Get started for free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-gray-600 text-sm font-mono">
        CodeSync — Built with React, Node.js, Socket.IO & MongoDB
      </footer>
    </div>
  );
}

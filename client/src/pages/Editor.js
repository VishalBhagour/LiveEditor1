import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { getSocket, connectSocket } from '../utils/socket';
import API from '../utils/api';
import UsersPanel from '../components/UsersPanel';

const LANGUAGE_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python:     'python',
  java:       'java',
  cpp:        'cpp',
  html:       'html',
};

const LANGUAGES = Object.keys(LANGUAGE_MAP);

const argToString = (v) => {
  if (v === null)            return 'null';
  if (v === undefined)       return 'undefined';
  if (typeof v === 'object') { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }
  return String(v);
};

const executeCode = async (code, language) => {
  if (language === 'javascript') {
    const logs = [];
    const _log   = console.log;
    const _error = console.error;
    const _warn  = console.warn;

    console.log   = (...a) => logs.push({ type: 'log',   text: a.map(argToString).join(' ') });
    console.error = (...a) => logs.push({ type: 'error', text: a.map(argToString).join(' ') });
    console.warn  = (...a) => logs.push({ type: 'warn',  text: a.map(argToString).join(' ') });

    try {
      const result = new Function(code)();
      if (result !== undefined) logs.push({ type: 'return', text: argToString(result) });
      if (logs.length === 0)    logs.push({ type: 'info',   text: '✓ Executed with no output' });
    } catch (err) {
      logs.push({ type: 'error', text: `${err.name}: ${err.message}` });
    } finally {
      console.log   = _log;
      console.error = _error;
      console.warn  = _warn;
    }
    return logs;
  }

  if (language === 'html') {
    return [{ type: 'html', text: code }];
  }

  try {
    const { data } = await API.post('/execute', { code, language });

    if (data.isHtml) {
      return [{ type: 'html', text: data.output }];
    }

    const output = data.output || '(no output)';
    const logs = [];

    output.split('\n').forEach((line) => {
      if (!line && logs.length > 0) return;
      const isError =
        line.startsWith('Error') ||
        line.startsWith('Exception') ||
        line.startsWith('Traceback') ||
        line.includes('error:') ||
        line.includes('ERROR');
      logs.push({ type: isError ? 'error' : 'log', text: line });
    });

    if (logs.length === 0) {
      logs.push({ type: 'info', text: '✓ Executed with no output' });
    }

    return logs;
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.response?.data?.output ||
      err.message ||
      'Unknown error';
    return [{ type: 'error', text: `Error: ${message}` }];
  }
};

const OutputLine = ({ line }) => {
  const cls = {
    log:    'text-gray-200',
    error:  'text-red-400',
    warn:   'text-yellow-400',
    return: 'text-blue-300',
    info:   'text-gray-500 italic',
  }[line.type] || 'text-gray-300';

  if (line.type === 'html') {
    return (
      <iframe
        title="HTML Preview"
        srcDoc={line.text}
        className="w-full rounded bg-white"
        style={{ height: 'calc(100% - 8px)', minHeight: 120, border: 'none' }}
        sandbox="allow-scripts"
      />
    );
  }

  return (
    <div className={`font-mono text-xs leading-6 whitespace-pre-wrap break-all ${cls}`}>
      {line.type === 'error'  && <span className="mr-2 not-italic">✖</span>}
      {line.type === 'warn'   && <span className="mr-2 not-italic">⚠</span>}
      {line.type === 'return' && <span className="mr-2 text-blue-500 not-italic">←</span>}
      {line.text}
    </div>
  );
};


export default function Editor() {
  const { roomId } = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [room,    setRoom]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [code,      setCode]      = useState('');
  const [language,  setLanguage]  = useState('javascript');
  const [myRole,    setMyRole]    = useState('viewer');
  const [editorKey, setEditorKey] = useState(0);

  const [activeUsers,   setActiveUsers]   = useState([]);
  const [saveStatus,    setSaveStatus]    = useState('saved');
  const [notifications, setNotifications] = useState([]);

  const [outputLines,  setOutputLines]  = useState([]);
  const [isRunning,    setIsRunning]    = useState(false);
  const [showOutput,   setShowOutput]   = useState(false);
  const [outputHeight, setOutputHeight] = useState(200);

  const [showUsers, setShowUsers] = useState(true);
  const [copied,    setCopied]    = useState(false);

  const editorRef      = useRef(null);
  const isRemoteChange = useRef(false);
  const outputEndRef   = useRef(null);
  const isDragging     = useRef(false);
  const dragStartY     = useRef(0);
  const dragStartH     = useRef(0);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data } = await API.get(`/rooms/${roomId}`);
        setRoom(data.room);
        const member = data.room.members?.find((m) => m.userId === user?.id);
        setMyRole(member?.role || 'viewer');
        if (data.session) {
          setCode(data.session.code || '');
          setLanguage(data.session.language || 'javascript');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load room.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, user?.id]);

  useEffect(() => {
    if (!room || !user) return;

    let socket = getSocket();
    if (!socket || !socket.connected) socket = connectSocket();
    if (!socket) return;

    socket.emit('join-room', {
      roomId:    room.roomId,
      userName:  user.name,
      userEmail: user.email,
    });

    socket.on('sync-code', ({ code: c, language: l }) => {
      isRemoteChange.current = true;
      setCode(c);
      setLanguage(l);
      setEditorKey((k) => k + 1);
      setTimeout(() => { isRemoteChange.current = false; }, 100);
    });

    socket.on('code-update', ({ code: c, language: l }) => {
      isRemoteChange.current = true;
      setCode(c);
      if (l) setLanguage(l);
      setSaveStatus('saving');
      setTimeout(() => { isRemoteChange.current = false; setSaveStatus('saved'); }, 800);
    });

    socket.on('language-update', ({ language: l }) => {
      setLanguage(l);
      setEditorKey((k) => k + 1);
    });

    socket.on('user-joined', ({ name, activeUsers: u }) => {
      setActiveUsers(u);
      if (name && name !== user.name) addNotification(`${name} joined`, 'join');
    });

    socket.on('user-left', ({ name, activeUsers: u }) => {
      setActiveUsers(u);
      if (name) addNotification(`${name} left`, 'leave');
    });

    socket.on('error', ({ message: m }) => addNotification(m, 'error'));

    return () => {
      socket.off('sync-code');
      socket.off('code-update');
      socket.off('language-update');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('error');
    };
  }, [room, user]);

  const handleCodeChange = useCallback((newCode) => {
    if (isRemoteChange.current) return;
    if (myRole === 'viewer') return;
    setCode(newCode);
    setSaveStatus('unsaved');
    const socket = getSocket();
    if (socket && room) {
      socket.emit('code-change', { roomId: room.roomId, code: newCode, language });
      setSaveStatus('saving');
      setTimeout(() => setSaveStatus('saved'), 1200);
    }
  }, [myRole, room, language]);

  const handleLanguageChange = (newLang) => {
    if (myRole === 'viewer') return;
    setLanguage(newLang);
    setEditorKey((k) => k + 1);
    const socket = getSocket();
    if (socket && room) {
      socket.emit('language-change', { roomId: room.roomId, language: newLang });
    }
  };

  const handleRunCode = useCallback(async () => {
    setIsRunning(true);
    setShowOutput(true);
    setOutputLines([{ type: 'info', text: `▶ Running ${language}…` }]);

    try {
      const result = await executeCode(code, language);
      setOutputLines(result);
    } catch (err) {
      setOutputLines([{ type: 'error', text: `Unexpected error: ${err.message}` }]);
    } finally {
      setIsRunning(false);
      setTimeout(() => outputEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [code, language]);

  const onDragStart = (e) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = outputHeight;
    document.body.style.cursor     = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      setOutputHeight(Math.min(520, Math.max(72, dragStartH.current + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications((n) => [...n, { id, message, type }]);
    setTimeout(() => setNotifications((n) => n.filter((x) => x.id !== id)), 3000);
  };

  const handleLeave = () => {
    const socket = getSocket();
    if (socket) socket.disconnect();
    navigate('/dashboard');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(room?.roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveLabel = {
    saved:   { text: 'Saved',   color: 'text-green-400'  },
    saving:  { text: 'Saving…', color: 'text-yellow-400' },
    unsaved: { text: 'Unsaved', color: 'text-gray-500'   },
  }[saveStatus];

  // All languages now supported via backend
  const canRunNatively = language === 'javascript' || language === 'html';

  if (loading) return (
    <div className="min-h-screen gradient-bg grid-pattern flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-mono text-sm">Loading editor…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen gradient-bg grid-pattern flex items-center justify-center">
      <div className="card text-center max-w-sm">
        <p className="text-white font-medium mb-1">Access Denied</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <Link to="/dashboard" className="btn-primary text-sm px-4 py-2 inline-block">← Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-editor-bg overflow-hidden">

      {/* ━━ TOOLBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-950/95 backdrop-blur flex-shrink-0 z-30">

        <Link to="/dashboard"
          className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors text-xs flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div className="w-px h-4 bg-gray-800 flex-shrink-0" />

        {/* Room name + ID */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="font-display font-semibold text-white text-sm truncate">{room?.name}</span>
          <button onClick={copyRoomId}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700
                       text-[10px] font-mono text-gray-500 hover:text-white transition-colors flex-shrink-0">
            {room?.roomId}
            {copied
              ? <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            }
          </button>
        </div>

        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={myRole === 'viewer'}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5
                     focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 flex-shrink-0"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>

        {/* ▶ RUN */}
        <button
          onClick={handleRunCode}
          disabled={isRunning}
          title={canRunNatively ? 'Run in browser' : `Run on server`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          {isRunning
            ? <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          }
          <span className="hidden sm:inline">{isRunning ? 'Running…' : 'Run'}</span>
        </button>

        {/* Output toggle */}
        <button
          onClick={() => setShowOutput((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors flex-shrink-0 ${
            showOutput ? 'bg-gray-700 text-white border border-gray-600' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Output</span>
        </button>

        <div className="w-px h-4 bg-gray-800 flex-shrink-0" />

        {/* Save status */}
        <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${saveLabel.color}`}>
          {saveStatus === 'saving'
            ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          }
          <span className="hidden sm:inline">{saveLabel.text}</span>
        </div>

        {/* Role badge */}
        <span className={`badge border text-[10px] flex-shrink-0 ${
          myRole === 'owner'  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
          myRole === 'editor' ? 'bg-blue-500/20   text-blue-300   border-blue-500/30'  :
                                'bg-gray-700/40   text-gray-400   border-gray-600/30'
        }`}>{myRole}</span>

        {/* Users toggle */}
        <button
          onClick={() => setShowUsers((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors flex-shrink-0 ${
            showUsers ? 'bg-blue-500/20 text-blue-300' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
          <span className="hidden sm:inline text-xs">{activeUsers.length}</span>
        </button>

        {/* Leave button */}
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-green-600 hover:bg-green-500 text-white transition-all flex-shrink-0"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>

      {/* Viewer banner */}
      {myRole === 'viewer' && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-center text-yellow-400 text-xs flex-shrink-0">
          👁 View-only mode — you cannot edit this code
        </div>
      )}

      {/* ━━ MAIN AREA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor + Output column */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Monaco */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              key={editorKey}
              height="100%"
              language={LANGUAGE_MAP[language] || 'javascript'}
              value={code}
              onChange={handleCodeChange}
              onMount={(editor) => { editorRef.current = editor; editor.focus(); }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                lineHeight: 1.7,
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                readOnly: myRole === 'viewer',
                padding: { top: 16 },
                renderLineHighlight: 'gutter',
                formatOnPaste: true,
                automaticLayout: true,
              }}
            />
          </div>

          {/* ━━ OUTPUT PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {showOutput && (
            <>
              {/* Drag-to-resize handle */}
              <div
                onMouseDown={onDragStart}
                className="h-1.5 bg-gray-800 hover:bg-blue-500/50 cursor-row-resize flex-shrink-0 transition-colors"
                title="Drag to resize"
              />

              <div
                className="flex flex-col bg-gray-950 border-t border-gray-800 flex-shrink-0"
                style={{ height: outputHeight }}
              >
                {/* Output toolbar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800 bg-gray-900/60 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-300 text-xs font-semibold">Output</span>
                    {/* ✅ Updated badge: shows server execution for non-browser langs */}
                    {!canRunNatively && (
                      <span className="text-[10px] text-green-500/80 border border-green-600/30 bg-green-500/10 rounded px-1.5 py-0.5">
                        runs on server
                      </span>
                    )}
                    {isRunning && (
                      <span className="flex items-center gap-1 text-[11px] text-green-400">
                        <span className="w-2.5 h-2.5 border border-green-400 border-t-transparent rounded-full animate-spin" />
                        Running…
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleRunCode}
                      disabled={isRunning}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-green-400
                                 hover:bg-green-500/10 disabled:opacity-40 transition-colors"
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Run again
                    </button>
                    <button
                      onClick={() => setOutputLines([])}
                      className="px-2 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowOutput(false)}
                      className="p-0.5 text-gray-600 hover:text-gray-300 transition-colors ml-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Output lines */}
                <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                  {outputLines.length === 0 && !isRunning && (
                    <span className="text-gray-600 text-xs font-mono italic">
                      Press <span className="text-green-500 not-italic font-semibold">▶ Run</span> to execute…
                    </span>
                  )}
                  {outputLines.map((line, i) => <OutputLine key={i} line={line} />)}
                  <div ref={outputEndRef} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Users panel */}
        {showUsers && (
          <div className="w-44 border-l border-gray-800 bg-gray-950/60 flex-shrink-0 overflow-hidden">
            <UsersPanel
              users={activeUsers}
              currentUserId={user?.id}
              roomMembers={room?.members || []}
            />
          </div>
        )}
      </div>

      {/* ━━ STATUS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center gap-3 px-4 py-1 border-t border-gray-800 bg-gray-950/95 text-[11px] text-gray-600 flex-shrink-0 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-pulse" />
          Connected
        </span>
        <span className="text-gray-800">|</span>
        <span>{language}</span>
        <span className="text-gray-800">|</span>
        <span>UTF-8</span>
        <span className="ml-auto text-gray-700">{room?.name}</span>
      </div>

      {/* ━━ TOASTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        {notifications.map((n) => (
          <div key={n.id} className={`px-3 py-2 rounded-lg text-xs font-medium shadow-xl animate-slide-up backdrop-blur-xl ${
            n.type === 'error' ? 'bg-red-500/20 border border-red-500/40 text-red-300'
            : n.type === 'join'  ? 'bg-green-500/15 border border-green-500/30 text-green-300'
            : 'bg-gray-800/90 border border-gray-700 text-gray-300'
          }`}>
            {n.type === 'join' ? '→ ' : n.type === 'leave' ? '← ' : ''}{n.message}
          </div>
        ))}
      </div>
    </div>
  );
}
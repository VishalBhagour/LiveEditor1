
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { getSocket, connectSocket } from '../utils/socket';
import API from '../utils/api';
import UsersPanel from '../components/UsersPanel';

const LANGUAGE_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  html: 'html',
};

const LANGUAGES = Object.keys(LANGUAGE_MAP);

export default function Editor() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();


  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [myRole, setMyRole] = useState('viewer');

  const [activeUsers, setActiveUsers] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [notifications, setNotifications] = useState([]);

  const [showUsers, setShowUsers] = useState(true);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef(null);
  const isRemoteChange = useRef(false); 

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
    if (!socket || !socket.connected) {
      socket = connectSocket();
    }
    if (!socket) return;

    socket.emit('join-room', {
      roomId: room.roomId,
      userName: user.name,
      userEmail: user.email,
    });

    socket.on('sync-code', ({ code: serverCode, language: serverLang }) => {
      isRemoteChange.current = true;
      setCode(serverCode);
      setLanguage(serverLang);
      setTimeout(() => { isRemoteChange.current = false; }, 100);
    });

    socket.on('code-update', ({ code: remoteCode, language: remoteLang }) => {
      isRemoteChange.current = true;
      setCode(remoteCode);
      if (remoteLang) setLanguage(remoteLang);
      setSaveStatus('saving');
      setTimeout(() => {
        isRemoteChange.current = false;
        setSaveStatus('saved');
      }, 800);
    });

    socket.on('language-update', ({ language: newLang }) => {
      setLanguage(newLang);
    });

    socket.on('user-joined', ({ name, activeUsers: users }) => {
      setActiveUsers(users);
      if (name && name !== user.name) {
        addNotification(`${name} joined the room`, 'join');
      }
    });

    socket.on('user-left', ({ name, activeUsers: users }) => {
      setActiveUsers(users);
      if (name) {
        addNotification(`${name} left the room`, 'leave');
      }
    });

    socket.on('error', ({ message }) => {
      addNotification(message, 'error');
    });

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
      socket.emit('code-change', {
        roomId: room.roomId,
        code: newCode,
        language,
      });
      setSaveStatus('saving');
      setTimeout(() => setSaveStatus('saved'), 1200);
    }
  }, [myRole, room, language]);

  const handleLanguageChange = (newLang) => {
    if (myRole === 'viewer') return;
    setLanguage(newLang);

    const socket = getSocket();
    if (socket && room) {
      socket.emit('language-change', { roomId: room.roomId, language: newLang });
    }
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications((n) => [...n, { id, message, type }]);
    setTimeout(() => {
      setNotifications((n) => n.filter((notif) => notif.id !== id));
    }, 3000);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(room?.roomId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const saveLabel = {
    saved: { text: 'Saved', color: 'text-green-400' },
    saving: { text: 'Saving...', color: 'text-yellow-400' },
    unsaved: { text: 'Unsaved', color: 'text-gray-500' },
  }[saveStatus];

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg grid-pattern flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-mono text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg grid-pattern flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">Access Denied</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Link to="/dashboard" className="btn-primary text-sm px-4 py-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-editor-bg overflow-hidden">
      {/* ── Top Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-950/90 backdrop-blur flex-shrink-0 z-30">
        {/* Back */}
        <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="w-px h-4 bg-gray-800" />

        {/* Room name + ID */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="font-display font-semibold text-white text-sm truncate">{room?.name}</span>
          </div>

          <button
            onClick={copyRoomId}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors text-xs font-mono text-gray-400 hover:text-white flex-shrink-0"
            title="Copy Room ID"
          >
            {room?.roomId}
            {copied ? (
              <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={myRole === 'viewer'}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>

        {/* Save status */}
        <div className={`flex items-center gap-1.5 text-xs ${saveLabel.color} flex-shrink-0`}>
          {saveStatus === 'saving' && (
            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          )}
          {saveStatus === 'saved' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="hidden sm:inline">{saveLabel.text}</span>
        </div>

        {/* Role badge */}
        <span className={`badge border text-[10px] flex-shrink-0 ${
          myRole === 'owner' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
          myRole === 'editor' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
          'bg-gray-700/40 text-gray-400 border-gray-600/30'
        }`}>
          {myRole}
        </span>

        {/* Toggle users panel */}
        <button
          onClick={() => setShowUsers((v) => !v)}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors flex-shrink-0 ${
            showUsers ? 'bg-blue-500/20 text-blue-300' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
          </svg>
          <span className="hidden sm:inline">{activeUsers.length}</span>
        </button>
      </div>

      {/* ── Viewer banner ──────────────────────────────────────── */}
      {myRole === 'viewer' && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-yellow-400 text-xs flex-shrink-0">
          👁 View-only mode — you cannot edit this code
        </div>
      )}

      {/* ── Main editor + users panel ──────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            height="100%"
            language={LANGUAGE_MAP[language] || 'javascript'}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
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
              suggest: { showKeywords: true },
              formatOnPaste: true,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Users Panel */}
        {showUsers && (
          <div className="w-48 border-l border-gray-800 bg-gray-950/50 flex-shrink-0 overflow-hidden">
            <UsersPanel
              users={activeUsers}
              currentUserId={user?.id}
              roomMembers={room?.members || []}
            />
          </div>
        )}
      </div>

      {/* ── Bottom status bar ──────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-t border-gray-800 bg-gray-950/90 text-xs text-gray-600 flex-shrink-0 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-pulse" />
          Connected
        </span>
        <span>{language}</span>
        <span className="ml-auto">{room?.name}</span>
      </div>

      {/* ── Toast notifications ──────────────────────────────── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-3 py-2 rounded-lg text-xs font-medium shadow-lg animate-slide-up backdrop-blur-xl ${
              n.type === 'error'
                ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                : n.type === 'join'
                ? 'bg-green-500/15 border border-green-500/30 text-green-300'
                : 'bg-gray-800/90 border border-gray-700 text-gray-300'
            }`}
          >
            {n.type === 'join' ? '→ ' : n.type === 'leave' ? '← ' : ''}{n.message}
          </div>
        ))}
      </div>
    </div>
  );
}

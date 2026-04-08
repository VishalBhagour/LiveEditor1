// pages/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'html'];

const ROLE_COLORS = {
  owner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  editor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  viewer: 'bg-gray-500/20 text-gray-400 border-gray-600/30',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [tab, setTab] = useState('rooms'); // 'rooms' | 'create' | 'join'

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', description: '', language: 'javascript', isPrivate: false });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join form
  const [joinId, setJoinId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const { data } = await API.get('/rooms/my-rooms');
      setRooms(data.rooms);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const { data } = await API.post('/rooms/create', createForm);
      navigate(`/editor/${data.room.roomId}`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError('');
    try {
      const { data } = await API.post('/rooms/join', { roomId: joinId.trim() });
      navigate(`/editor/${data.room.roomId}`);
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Room not found.');
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm('Delete this room? This cannot be undone.')) return;
    try {
      await API.delete(`/rooms/${roomId}`);
      setRooms((r) => r.filter((room) => room.roomId !== roomId));
    } catch (err) {
      alert('Failed to delete room.');
    }
  };

  const getUserRole = (room) => {
    const member = room.members?.find((m) => m.userId === user?.id);
    return member?.role || 'viewer';
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen gradient-bg grid-pattern">
      {/* Top header bar */}
      <div className="border-b border-gray-800 bg-gray-950/60 backdrop-blur-xl sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-white">Dashboard</h1>
            <p className="text-gray-500 text-xs">Welcome back, {user?.name?.split(' ')[0]}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('join')} className="btn-ghost text-sm py-1.5 px-3">
              Join room
            </button>
            <button onClick={() => setTab('create')} className="btn-primary text-sm py-1.5 px-3">
              + New room
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-16">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-8 bg-gray-900 p-1 rounded-xl w-fit">
          {[
            { id: 'rooms', label: 'My Rooms' },
            { id: 'create', label: '+ Create' },
            { id: 'join', label: '→ Join' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── MY ROOMS ── */}
        {tab === 'rooms' && (
          <div>
            {loadingRooms ? (
              <div className="flex justify-center py-20">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <p className="text-gray-400 font-medium mb-1">No rooms yet</p>
                <p className="text-gray-600 text-sm mb-6">Create your first room or join one with a Room ID.</p>
                <button onClick={() => setTab('create')} className="btn-primary text-sm px-4 py-2">
                  Create room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const myRole = getUserRole(room);
                  return (
                    <div key={room._id} className="card hover:border-gray-700 transition-all group cursor-pointer"
                      onClick={() => navigate(`/editor/${room.roomId}`)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                            {room.name}
                          </h3>
                          {room.description && (
                            <p className="text-gray-500 text-xs mt-0.5 truncate">{room.description}</p>
                          )}
                        </div>
                        {myRole === 'owner' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(room.roomId); }}
                            className="ml-2 p-1 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className={`badge border ${ROLE_COLORS[myRole]}`}>{myRole}</span>
                        <span className="badge bg-gray-800 text-gray-500 border border-gray-700 font-mono">
                          {room.language}
                        </span>
                        {room.isPrivate && (
                          <span className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            private
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1">
                            {room.members?.slice(0, 3).map((m, i) => (
                              <div key={i}
                                className="w-5 h-5 rounded-full bg-blue-500/20 border border-gray-900 flex items-center justify-center text-blue-300 text-[9px] font-semibold">
                                {m.name?.[0]?.toUpperCase() || '?'}
                              </div>
                            ))}
                          </div>
                          <span>{room.members?.length || 0} member{room.members?.length !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="font-mono">{formatDate(room.updatedAt)}</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                        <span className="font-mono text-gray-600 text-xs">{room.roomId}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(room.roomId);
                          }}
                          className="text-gray-600 hover:text-blue-400 transition-colors"
                          title="Copy Room ID"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE ROOM ── */}
        {tab === 'create' && (
          <div className="max-w-lg animate-slide-up">
            <h2 className="font-display text-xl font-bold text-white mb-6">Create a new room</h2>
            <div className="card">
              {createError && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Room name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="My awesome project"
                    className="input-field"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional description..."
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Language</label>
                  <select
                    value={createForm.language}
                    onChange={(e) => setCreateForm((f) => ({ ...f, language: e.target.value }))}
                    className="input-field appearance-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm((f) => ({ ...f, isPrivate: !f.isPrivate }))}
                    className={`w-9 h-5 rounded-full transition-colors relative ${createForm.isPrivate ? 'bg-blue-500' : 'bg-gray-700'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${createForm.isPrivate ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <label className="text-gray-400 text-sm">Private room</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={creating} className="btn-primary flex-1 py-2.5">
                    {creating ? 'Creating...' : 'Create room'}
                  </button>
                  <button type="button" onClick={() => setTab('rooms')} className="btn-ghost px-4">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── JOIN ROOM ── */}
        {tab === 'join' && (
          <div className="max-w-lg animate-slide-up">
            <h2 className="font-display text-xl font-bold text-white mb-6">Join a room</h2>
            <div className="card">
              {joinError && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {joinError}
                </div>
              )}
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Room ID</label>
                  <input
                    type="text"
                    value={joinId}
                    onChange={(e) => { setJoinId(e.target.value.toUpperCase()); setJoinError(''); }}
                    placeholder="e.g. A1B2C3D4"
                    className="input-field font-mono uppercase tracking-widest"
                    maxLength={8}
                    required
                    autoFocus
                  />
                  <p className="text-gray-600 text-xs mt-1.5">Ask the room owner for their 8-character Room ID.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={joining || joinId.length < 6} className="btn-primary flex-1 py-2.5">
                    {joining ? 'Joining...' : 'Join room →'}
                  </button>
                  <button type="button" onClick={() => setTab('rooms')} className="btn-ghost px-4">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

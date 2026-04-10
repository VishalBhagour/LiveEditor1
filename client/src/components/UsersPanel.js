// components/UsersPanel.js — Shows who's in the room
import React from 'react';

const ROLE_COLORS = {
  owner: 'text-purple-300',
  editor: 'text-blue-300',
  viewer: 'text-gray-400',
};

const AVATAR_COLORS = [
  'bg-pink-500/30 text-pink-300 border-pink-500/40',
  'bg-blue-500/30 text-blue-300 border-blue-500/40',
  'bg-green-500/30 text-green-300 border-green-500/40',
  'bg-yellow-500/30 text-yellow-300 border-yellow-500/40',
  'bg-purple-500/30 text-purple-300 border-purple-500/40',
  'bg-cyan-500/30 text-cyan-300 border-cyan-500/40',
];

const UsersPanel = ({ users = [], currentUserId, roomMembers = [] }) => {
  // Merge socket active users with room member roles
  const enrichedUsers = users.map((u, idx) => {
    const member = roomMembers.find((m) => m.userId === u.userId);
    return {
      ...u,
      role: member?.role || u.role || 'editor',
      colorClass: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    };
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2.5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-pulse" />
          <span className="text-gray-400 text-xs font-medium">
            {users.length} online
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {enrichedUsers.map((user) => (
          <div
            key={user.userId}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors ${
              user.userId === currentUserId ? 'bg-gray-800/60' : 'hover:bg-gray-800/40'
            }`}
          >
            {/* Avatar */}
            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0 ${user.colorClass}`}>
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-gray-300 text-xs font-medium truncate">
                  {user.name}
                  {user.userId === currentUserId && (
                    <span className="text-gray-600 ml-1">(you)</span>
                  )}
                </span>
              </div>
              <span className={`text-[10px] ${ROLE_COLORS[user.role] || 'text-gray-500'}`}>
                {user.role}
              </span>
            </div>

            {/* Online indicator */}
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-6">
            <p className="text-gray-600 text-xs">No one else here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPanel;

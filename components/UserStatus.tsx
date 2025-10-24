import React from 'react';

export type UserStatusType = 'online' | 'offline' | 'dnd';

export const statusLabels: Record<UserStatusType, string> = {
  online: 'Онлайн',
  offline: 'Оффлайн',
  dnd: 'Не беспокоить',
};

export const statusColors: Record<UserStatusType, string> = {
  online: '#4caf50',
  offline: '#9e9e9e',
  dnd: '#4fc3f7',
};

export interface UserStatusProps {
  status: UserStatusType;
  size?: number;
  showLabel?: boolean;
}

const UserStatus: React.FC<UserStatusProps> = ({ status, size = 12, showLabel = false }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: statusColors[status],
        marginRight: showLabel ? 6 : 0,
        border: '1px solid #fff',
        boxShadow: '0 0 2px rgba(0,0,0,0.15)',
      }}
    />
    {showLabel && <span style={{ fontSize: size - 2 }}>{statusLabels[status]}</span>}
  </span>
);

export default UserStatus;

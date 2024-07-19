import React from 'react';

interface SessionDashboardProps {
  sessionId: string;
  activeParticipants: number;
  inactiveParticipants: number;
  hasResultText: boolean;
}

const SessionDashboard: React.FC<SessionDashboardProps> = ({
  sessionId,
  activeParticipants,
  inactiveParticipants,
  hasResultText
}) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4">
      <h3 className="text-xl font-bold mb-4">Session ID: {sessionId}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{activeParticipants}</p>
          <p className="text-sm text-gray-600">Active Participants</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{inactiveParticipants}</p>
          <p className="text-sm text-gray-600">Inactive Participants</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{hasResultText ? 'Yes' : 'No'}</p>
          <p className="text-sm text-gray-600">Result Available</p>
        </div>
      </div>
    </div>
  );
};

export default SessionDashboard;
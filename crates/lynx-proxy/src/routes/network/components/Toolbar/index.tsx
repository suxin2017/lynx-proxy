import React from 'react';
import { RecordingStatusButton } from '../RecordingStatusButton';
import { CleanRequestButton } from '../CleanRequestButton';

export const Toolbar: React.FC = () => {
  return (
    <div className="flex items-center">
      <RecordingStatusButton />
      <CleanRequestButton />
    </div>
  );
};

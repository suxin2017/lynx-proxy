import React from 'react';
import { RecordingStatusButton } from '../RecordingStatusButton';
import { CleanRequestButton } from '../CleanRequestButton';

export const Toolbar: React.FC = () => {
  return (
    <div className="flex items-center m-[2px] h-6">
      <RecordingStatusButton />
      <CleanRequestButton />
    </div>
  );
};

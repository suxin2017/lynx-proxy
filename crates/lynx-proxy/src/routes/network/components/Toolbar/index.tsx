import React from 'react';
import { RecordingStatusButton } from '../RecordingStatusButton';
import { CleanRequestButton } from '../CleanRequestButton';
import { TableFilter } from '../TableFilter';

export const Toolbar: React.FC = () => {
  return (
    <div className="m-[2px] flex h-8 items-center">
      <RecordingStatusButton />
      <CleanRequestButton />
      <TableFilter />
    </div>
  );
};

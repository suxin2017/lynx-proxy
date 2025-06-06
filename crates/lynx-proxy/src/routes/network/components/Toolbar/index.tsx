import React, { PropsWithChildren } from 'react';
import { RecordingStatusButton } from '../RecordingStatusButton';
import { CleanRequestButton } from '../CleanRequestButton';
import { SearchRequestUrlInput } from '../TableFilter';

export const Toolbar: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="m-[2px] flex h-8 items-center gap-1">
      <RecordingStatusButton />
      <CleanRequestButton />
      <SearchRequestUrlInput />
      {children}
    </div>
  );
};

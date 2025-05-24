import React, { createContext, useContext, useState } from 'react';

interface AutoScrollContextType {
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
}

const AutoScrollContext = createContext<AutoScrollContextType | undefined>(
  undefined,
);

export const AutoScrollProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <AutoScrollContext.Provider value={{ autoScroll, setAutoScroll }}>
      {children}
    </AutoScrollContext.Provider>
  );
};

export const useAutoScroll = (): AutoScrollContextType => {
  const context = useContext(AutoScrollContext);
  if (context === undefined) {
    throw new Error('useAutoScroll must be used within a AutoScrollProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HandlerCollapseContextType {
  expandedHandlers: Set<number>;
  toggleExpand: (index: number) => void;
  isExpanded: (index: number) => boolean;
  collapseAll: () => void;
}

const HandlerCollapseContext = createContext<HandlerCollapseContextType | undefined>(undefined);

export const useHandlerCollapse = () => {
  const context = useContext(HandlerCollapseContext);
  if (!context) {
    throw new Error('useHandlerCollapse must be used within a HandlerCollapseProvider');
  }
  return context;
};

interface HandlerCollapseProviderProps {
  children: ReactNode;
}

export const HandlerCollapseProvider: React.FC<HandlerCollapseProviderProps> = ({ children }) => {
  const [expandedHandlers, setExpandedHandlers] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedHandlers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const isExpanded = (index: number) => {
    return expandedHandlers.has(index);
  };

  const collapseAll = () => {
    setExpandedHandlers(new Set());
  };

  return (
    <HandlerCollapseContext.Provider
      value={{
        expandedHandlers,
        toggleExpand,
        isExpanded,
        collapseAll,
      }}
    >
      {children}
    </HandlerCollapseContext.Provider>
  );
};
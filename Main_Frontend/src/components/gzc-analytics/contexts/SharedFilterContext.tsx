import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FilterState } from '../types';

interface SharedFilterContextType {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  timeRange: '1D',
  symbols: [],
  marketType: 'ALL',
  region: 'ALL'
};

const SharedFilterContext = createContext<SharedFilterContextType | undefined>(undefined);

export const useSharedFilters = () => {
  const context = useContext(SharedFilterContext);
  if (!context) {
    throw new Error('useSharedFilters must be used within SharedFilterProvider');
  }
  return context;
};

interface SharedFilterProviderProps {
  children: ReactNode;
}

export const SharedFilterProvider: React.FC<SharedFilterProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <SharedFilterContext.Provider value={{ filters, updateFilter, resetFilters }}>
      {children}
    </SharedFilterContext.Provider>
  );
};
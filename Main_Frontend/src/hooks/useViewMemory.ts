import { useState, useEffect, useCallback } from 'react';

// Types for view memory
export interface ViewMemoryLayout {
  [tabName: string]: {
    lg?: any[];
    md?: any[];
    sm?: any[];
  };
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: {
    timeRange?: string;
    currencies?: string[];
    aggregation?: string;
    [key: string]: any;
  };
}

export interface ComponentState {
  [componentId: string]: {
    expanded?: boolean;
    activeTab?: string;
    scrollPosition?: number;
    customSettings?: any;
  };
}

export interface ViewMemory {
  layouts: ViewMemoryLayout;
  filterPresets: FilterPreset[];
  activeFilterPreset?: string;
  componentStates: ComponentState;
  tabOrder?: string[];
  activeTab?: string;
  theme?: {
    customColors?: any;
    fontSize?: 'small' | 'medium' | 'large';
    currentTheme?: string;
    themeSystem?: {
      availableThemes: string[];
      gzcGreenSystem: {
        base: string;
        light: string;
        dark: string;
        opacityVariants: string[];
      };
      lightThemeDetection: string[];
      componentStyling: {
        logoColorLogic: string;
        tabBackgroundLogic: string;
        arcticMonochromaticApproach: string;
      };
      designPrinciples: {
        singleGreenPhilosophy: string;
        institutionalIdentity: string;
        monochromaticInteractions: string;
      };
      fileLocations: {
        themeDefinitions: string;
        themeContext: string;
        themeSelector: string;
        styleGuide: string;
      };
    };
  };
}

const STORAGE_KEY = 'gzc-platform-view-memory';

// Default presets
const defaultFilterPresets: FilterPreset[] = [
  {
    id: 'default',
    name: 'Default View',
    filters: {
      timeRange: '1D',
      currencies: ['EUR', 'USD'],
      aggregation: '5m'
    }
  },
  {
    id: 'intraday',
    name: 'Intraday Trading',
    filters: {
      timeRange: '1H',
      currencies: ['EUR', 'USD', 'GBP', 'JPY'],
      aggregation: '1m'
    }
  },
  {
    id: 'weekly',
    name: 'Weekly Analysis',
    filters: {
      timeRange: '1W',
      currencies: ['EUR', 'USD'],
      aggregation: '1h'
    }
  }
];

export const useViewMemory = () => {
  const [viewMemory, setViewMemory] = useState<ViewMemory>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all fields exist
        return {
          layouts: parsed.layouts || {},
          filterPresets: parsed.filterPresets || defaultFilterPresets,
          activeFilterPreset: parsed.activeFilterPreset,
          componentStates: parsed.componentStates || {},
          tabOrder: parsed.tabOrder,
          activeTab: parsed.activeTab,
          theme: parsed.theme
        };
      }
    } catch (error) {
      console.error('Failed to load view memory:', error);
    }
    
    return {
      layouts: {},
      filterPresets: defaultFilterPresets,
      componentStates: {}
    };
  });

  // Save to localStorage whenever viewMemory changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewMemory));
    } catch (error) {
      console.error('Failed to save view memory:', error);
    }
  }, [viewMemory]);

  // Layout management
  const saveLayout = useCallback((tabName: string, layouts: any) => {
    setViewMemory(prev => ({
      ...prev,
      layouts: {
        ...prev.layouts,
        [tabName]: layouts
      }
    }));
  }, []);

  const getLayout = useCallback((tabName: string) => {
    return viewMemory.layouts[tabName];
  }, [viewMemory.layouts]);

  // Filter preset management
  const saveFilterPreset = useCallback((preset: FilterPreset) => {
    setViewMemory(prev => {
      const existing = prev.filterPresets.findIndex(p => p.id === preset.id);
      const updated = [...prev.filterPresets];
      
      if (existing >= 0) {
        updated[existing] = preset;
      } else {
        updated.push(preset);
      }
      
      return {
        ...prev,
        filterPresets: updated
      };
    });
  }, []);

  const deleteFilterPreset = useCallback((presetId: string) => {
    setViewMemory(prev => ({
      ...prev,
      filterPresets: prev.filterPresets.filter(p => p.id !== presetId),
      activeFilterPreset: prev.activeFilterPreset === presetId ? undefined : prev.activeFilterPreset
    }));
  }, []);

  const setActiveFilterPreset = useCallback((presetId: string | undefined) => {
    setViewMemory(prev => ({
      ...prev,
      activeFilterPreset: presetId
    }));
  }, []);

  // Component state management
  const saveComponentState = useCallback((componentId: string, state: any) => {
    setViewMemory(prev => ({
      ...prev,
      componentStates: {
        ...prev.componentStates,
        [componentId]: {
          ...prev.componentStates[componentId],
          ...state
        }
      }
    }));
  }, []);

  const getComponentState = useCallback((componentId: string) => {
    return viewMemory.componentStates[componentId] || {};
  }, [viewMemory.componentStates]);

  // Tab management
  const saveTabOrder = useCallback((tabOrder: string[]) => {
    setViewMemory(prev => ({
      ...prev,
      tabOrder
    }));
  }, []);

  const saveActiveTab = useCallback((activeTab: string) => {
    setViewMemory(prev => ({
      ...prev,
      activeTab
    }));
  }, []);

  // Theme management
  const saveThemeSettings = useCallback((theme: any) => {
    setViewMemory(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...theme
      }
    }));
  }, []);

  // Initialize theme system with comprehensive style references
  const initializeThemeSystem = useCallback(() => {
    const themeSystemData = {
      currentTheme: 'gzc-dark',
      themeSystem: {
        availableThemes: [
          'gzc-dark', 'analytics-dark', 'terminal-green', 'trading-ops', 
          'midnight-trading', 'quantum-analytics', 'professional',
          'institutional', 'arctic', 'parchment', 'pearl'
        ],
        gzcGreenSystem: {
          base: '#7A9E65',
          light: '#95BD78',
          dark: '#5B7C4B',
          opacityVariants: ['E6', 'CC', '99', '66', '33', '1A']
        },
        lightThemeDetection: ['institutional', 'arctic', 'parchment', 'pearl'],
        componentStyling: {
          logoColorLogic: 'Light themes: theme.text | Dark themes: #E0E0E0',
          tabBackgroundLogic: 'Arctic: rgba(0,0,0,0.05) | Others: theme.primary + 20',
          arcticMonochromaticApproach: 'Selected: rgba(0,0,0,0.05) | Hover: rgba(0,0,0,0.02)'
        },
        designPrinciples: {
          singleGreenPhilosophy: 'Use GZC green base with opacity variations, not multiple greens',
          institutionalIdentity: 'All themes maintain GZC green #7A9E65 for success states',
          monochromaticInteractions: 'Prefer brightness/opacity over color changes for interactions'
        },
        fileLocations: {
          themeDefinitions: '/src/theme/themes.ts',
          themeContext: '/src/contexts/ThemeContext.tsx',
          themeSelector: '/src/components/ThemeSelector.tsx',
          styleGuide: '/STYLE_GUIDE.md'
        }
      }
    };
    
    saveThemeSettings(themeSystemData);
    console.log('Theme system initialized in view memory with comprehensive style references');
  }, [saveThemeSettings]);

  // Reset functions
  const resetLayouts = useCallback(() => {
    setViewMemory(prev => ({
      ...prev,
      layouts: {}
    }));
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setViewMemory({
      layouts: {},
      filterPresets: defaultFilterPresets,
      componentStates: {}
    });
  }, []);

  // Export/Import functionality
  const exportMemory = useCallback(() => {
    const dataStr = JSON.stringify(viewMemory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportName = `gzc-view-memory-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  }, [viewMemory]);

  const importMemory = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setViewMemory({
          layouts: imported.layouts || {},
          filterPresets: imported.filterPresets || defaultFilterPresets,
          activeFilterPreset: imported.activeFilterPreset,
          componentStates: imported.componentStates || {},
          tabOrder: imported.tabOrder,
          activeTab: imported.activeTab,
          theme: imported.theme
        });
      } catch (error) {
        console.error('Failed to import view memory:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    // Data
    viewMemory,
    
    // Layout functions
    saveLayout,
    getLayout,
    
    // Filter preset functions
    filterPresets: viewMemory.filterPresets,
    activeFilterPreset: viewMemory.activeFilterPreset,
    saveFilterPreset,
    deleteFilterPreset,
    setActiveFilterPreset,
    
    // Component state functions
    saveComponentState,
    getComponentState,
    
    // Tab functions
    tabOrder: viewMemory.tabOrder,
    activeTab: viewMemory.activeTab,
    saveTabOrder,
    saveActiveTab,
    
    // Theme functions
    theme: viewMemory.theme,
    saveThemeSettings,
    initializeThemeSystem,
    
    // Utility functions
    resetLayouts,
    resetAll,
    exportMemory,
    importMemory
  };
};
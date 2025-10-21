import React from 'react';
import PortfolioTableAGGrid from './PortfolioTableAGGrid';

// Test component to verify AG Grid implementation
const TestAGGrid: React.FC = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h2>AG Grid Portfolio Table Test</h2>
            <PortfolioTableAGGrid
                selectedDate="2024-01-15"
                fundId={1}
                isLive={true}
                externalEditing={false}
                componentId="test-ag-grid"
                deviceType="bigscreen"
            />
        </div>
    );
};

export default TestAGGrid;

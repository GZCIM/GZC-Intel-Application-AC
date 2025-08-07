import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export const PortfolioComponent: React.FC = () => {
  const [positions] = useState<Position[]>([
    { symbol: 'AAPL', quantity: 100, avgPrice: 150, currentPrice: 155, pnl: 500, pnlPercent: 3.33 },
    { symbol: 'MSFT', quantity: 50, avgPrice: 300, currentPrice: 310, pnl: 500, pnlPercent: 3.33 },
    { symbol: 'GOOGL', quantity: 20, avgPrice: 2500, currentPrice: 2450, pnl: -1000, pnlPercent: -2.0 },
    { symbol: 'AMZN', quantity: 30, avgPrice: 140, currentPrice: 145, pnl: 150, pnlPercent: 3.57 },
  ]);

  const totalValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0);
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPnLPercent = (totalPnL / (totalValue - totalPnL)) * 100;

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Overview</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total P&L</p>
          <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Return</p>
          <p className={`text-xl font-bold ${totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
          </p>
        </motion.div>
      </div>

      {/* Positions Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-gray-800">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Symbol</th>
              <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Qty</th>
              <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Avg Price</th>
              <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Current</th>
              <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">P&L</th>
              <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">%</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => (
              <motion.tr
                key={position.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{position.symbol}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{position.quantity}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">${position.avgPrice.toFixed(2)}</td>
                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">${position.currentPrice.toFixed(2)}</td>
                <td className={`py-2 px-3 text-right font-medium ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)}
                </td>
                <td className={`py-2 px-3 text-right font-medium ${position.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
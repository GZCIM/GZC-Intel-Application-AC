            </div>

            {/* Error display for partial loads */}
            {error && positions.length > 0 && (
                <div className="mt-3 rounded border border-yellow-500 bg-yellow-50 text-yellow-700 px-3 py-2">
                    {error}
                    <button
                        onClick={() => retryWithBackoff(2)}
                        className="ml-3 px-2 py-0.5 bg-yellow-600 text-white rounded"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};

export default PortfolioTableAGGrid;

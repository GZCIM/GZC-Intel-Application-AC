# Bundle Analyzer Setup ✅

## Usage

Run the build with bundle analysis:
```bash
npm run build:analyze
```

This will:
1. Build your production bundle
2. Generate `bundle-stats.html` in the project root
3. Automatically open the visualization in your browser

## Features

- **Treemap visualization**: Shows relative sizes of all modules
- **Gzip sizes**: See compressed sizes for realistic network impact
- **Brotli sizes**: Modern compression algorithm sizes
- **Interactive**: Click modules to zoom in, see import chains

## What to Look For

1. **Large dependencies**: Identify packages taking up too much space
2. **Duplicate code**: Same module imported multiple times
3. **Unused exports**: Code that's bundled but never used
4. **Optimization opportunities**: Libraries that could be replaced with smaller alternatives

## Manual Chunks

The build is already configured to split vendor code:
- `react-vendor`: React core libraries
- `ui-vendor`: UI libraries (Framer Motion, Lucide)
- `analytics`: Data visualization (Charts, Tables)

## Tips

- Focus on the largest modules first
- Consider lazy loading for large features
- Use dynamic imports for code splitting
- Replace heavy libraries with lighter alternatives when possible
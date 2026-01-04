# HA Data Visualizer

A Home Assistant custom panel for on-demand data visualization.

## Features

- Sidebar panel integration
- Entity picker with search and area grouping
- Natural language queries ("power usage last 7 days")
- Multiple chart types (line, bar, area, pie, scatter)
- Multi-axis support
- Save and load charts

## Installation

### HACS (Recommended)

1. Open HACS
2. Go to Integrations
3. Click the three dots menu → Custom repositories
4. Add this repository URL
5. Install "Data Visualizer"
6. Restart Home Assistant

### Manual

1. Copy `custom_components/data_visualizer` to your `config/custom_components/` directory
2. Restart Home Assistant

## Usage

After installation, "Data Visualizer" will appear in your sidebar.

## Development

```bash
cd frontend
npm install
npm run dev    # Development mode
npm run build  # Build for production
npm run test   # Run tests
```

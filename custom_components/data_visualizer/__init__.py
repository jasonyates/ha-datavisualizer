"""Data Visualizer integration for Home Assistant."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, PANEL_URL, PANEL_TITLE, PANEL_ICON

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Data Visualizer integration."""

    # Register the frontend panel
    frontend_path = Path(__file__).parent / "frontend"

    # Serve the frontend files
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/data_visualizer_frontend",
            str(frontend_path),
            cache_headers=False,
        )
    ])

    # Register the panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path="data-visualizer",
        config={
            "_panel_custom": {
                "name": "ha-data-visualizer",
                "embed_iframe": False,
                "trust_external": False,
                "module_url": "/data_visualizer_frontend/ha-data-visualizer.js",
            }
        },
        require_admin=False,
    )

    _LOGGER.info("Data Visualizer panel registered")
    return True

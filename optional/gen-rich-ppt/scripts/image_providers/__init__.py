"""Image API providers for the gen-rich-ppt fallback CLI."""

from .base import ImageProvider
from .factory import create_image_provider

__all__ = ["ImageProvider", "create_image_provider"]

"""
id_parsers/__init__.py
Modular Philippine ID Parser Registry.

Each ID type has its own parser module with specialized field extraction logic.
The dispatcher in this file routes OCR text to the appropriate parser.
"""

from .base import BaseIDParser, ParsedIDData
from .philid import PhilIDParser
from .umid import UMIDParser
from .lto import LTOParser
from .prc import PRCParser
from .philhealth import PhilHealthParser
from .pagibig import PagIBIGParser
from .postal import PostalIDParser
from .comelec import COMLECParser
from .passport import PassportParser
from .gsis import GSISParser
from .barangay import BarangayIDParser

# Registry maps detected id_type keys → parser class
PARSER_REGISTRY = {
    'philid':     PhilIDParser,
    'philsys':    PhilIDParser,
    'umid':       UMIDParser,
    'lto':        LTOParser,
    'prc':        PRCParser,
    'philhealth': PhilHealthParser,
    'pagibig':    PagIBIGParser,
    'postal':     PostalIDParser,
    'comelec':    COMLECParser,
    'passport':   PassportParser,
    'gsis':       GSISParser,
    'sss_gsis':   GSISParser,
    'barangay':   BarangayIDParser,
}


def get_parser(id_type: str) -> BaseIDParser:
    """Return the appropriate parser instance for the given ID type.
    Falls back to the base parser for unknown ID types."""
    cls = PARSER_REGISTRY.get(id_type, BaseIDParser)
    return cls()

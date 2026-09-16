"""Pure logic for the gazetteer.

Same rule as the Foundry module's `scripts/core/` and the city-map editor's
`src/lib/core/` (design/testing-strategy.md §1): nothing in this package may
import a web framework, touch a request, or reach for a browser global. It is
arithmetic and data shapes, unit-testable in plain Python.

`georef.py` is the one deliberate exception to "no dependencies" -- it imports
`citymap.frame` for the page rotation rather than restating it. See its module
docstring.
"""

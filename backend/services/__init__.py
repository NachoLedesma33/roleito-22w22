"""Servicios compartidos por los routers del backend.

Acá vive lo que más de un router necesita y hoy estaba duplicado dentro de
`character_routes.py`: cómo se arma el payload de una ficha (vida, inventario,
conjuros) y cómo se guardan/borran archivos de assets.

No es una capa de repositorios ni una fachada: son funciones puras sobre
`AsyncSession` y el filesystem, sin estado.
"""
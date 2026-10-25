"""Reglas de negocio puras: sin base de datos, sin HTTP y sin reloj.

Reciben datos y devuelven resultados; por eso se prueban con casos exhaustivos (todas las
quincenas de un año, febrero bisiesto, redondeos) sin preparar nada. Solo dependen de
``app.core.constants``. Los servicios las usan; nunca al revés.
"""

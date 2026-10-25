"""Nombre de una materia escrito de forma coherente (RN-09).

La comparación de duplicados la hace la base (``normalize_name``: sin acentos, en
minúsculas y con espacios simples); aquí solo se decide cómo **se guarda y se muestra**:

- espacios repetidos se reducen a uno y se quitan los de los extremos;
- cada palabra escrita toda en minúsculas empieza con mayúscula, salvo artículos,
  preposiciones y conjunciones (``SUBJECT_NAME_LOWERCASE_WORDS``) que no van al inicio;
- los números romanos van en mayúsculas («Cálculo II»);
- una palabra que ya trae mayúsculas se respeta tal cual («TIC», «JavaScript»), y un nombre
  escrito todo en mayúsculas se trata como si viniera en minúsculas.
"""

import unicodedata

from app.core.constants import SUBJECT_NAME_LOWERCASE_WORDS, SUBJECT_NAME_ROMAN_NUMERALS


def sort_key(text: str) -> str:
    """Clave para ordenar nombres en español sin que los acentos los manden al final
    («Álgebra» antes que «Programación»)."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).casefold()


def _format_word(word: str, *, is_first: bool) -> str:
    if word != word.lower():
        return word
    if word in SUBJECT_NAME_ROMAN_NUMERALS and not is_first:
        return word.upper()
    if word in SUBJECT_NAME_LOWERCASE_WORDS and not is_first:
        return word
    return word[:1].upper() + word[1:]


def format_subject_name(raw: str) -> str:
    words = raw.split()
    letters = "".join(character for character in raw if character.isalpha())
    if len(words) > 1 and letters.isupper():
        words = [word.lower() for word in words]
    return " ".join(_format_word(word, is_first=index == 0) for index, word in enumerate(words))

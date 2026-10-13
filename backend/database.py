"""
Módulo de Base de Datos — SQLite para el Termómetro Social de Jujuy.

Gestiona la creación de tablas, inserción, consulta y estadísticas
de noticias y comentarios. Thread-safe con check_same_thread=False.
"""

import sqlite3
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from backend.config import DB_PATH

logger = logging.getLogger(__name__)


def _get_connection() -> sqlite3.Connection:
    """Crea y retorna una conexión a SQLite con WAL mode para concurrencia."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Crea las tablas si no existen."""
    conn = _get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS noticias (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo      TEXT    NOT NULL,
                link        TEXT    UNIQUE NOT NULL,
                fecha       TEXT    NOT NULL,
                fuente      TEXT    NOT NULL,
                contenido   TEXT    DEFAULT '',
                keywords    TEXT    DEFAULT '',
                tema        TEXT    DEFAULT '',
                created_at  TEXT    DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS comentarios (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                noticia_id  INTEGER NOT NULL,
                texto       TEXT    NOT NULL,
                sentimiento TEXT    DEFAULT 'NEU',
                score       REAL   DEFAULT 0.0,
                keywords    TEXT    DEFAULT '',
                fecha       TEXT    NOT NULL,
                created_at  TEXT    DEFAULT (datetime('now')),
                FOREIGN KEY (noticia_id) REFERENCES noticias(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_noticias_fecha
                ON noticias(fecha DESC);
            CREATE INDEX IF NOT EXISTS idx_noticias_fuente
                ON noticias(fuente);
            CREATE INDEX IF NOT EXISTS idx_noticias_tema
                ON noticias(tema);
            CREATE INDEX IF NOT EXISTS idx_comentarios_noticia
                ON comentarios(noticia_id);
            CREATE INDEX IF NOT EXISTS idx_comentarios_sentimiento
                ON comentarios(sentimiento);
            CREATE INDEX IF NOT EXISTS idx_comentarios_fecha
                ON comentarios(fecha DESC);
        """)
        conn.commit()
        logger.info("Base de datos inicializada correctamente en %s", DB_PATH)
    except sqlite3.Error as e:
        logger.error("Error al inicializar la BD: %s", e)
        raise
    finally:
        conn.close()


# ─────────────────────────────────────────────
# OPERACIONES DE NOTICIAS
# ─────────────────────────────────────────────

def insertar_noticia(
    titulo: str,
    link: str,
    fecha: str,
    fuente: str,
    contenido: str = "",
    keywords: str = "",
    tema: str = "",
) -> Optional[int]:
    """
    Inserta una noticia. Retorna el ID de la fila o None si ya existe (UNIQUE link).
    """
    conn = _get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO noticias
                (titulo, link, fecha, fuente, contenido, keywords, tema)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (titulo, link, fecha, fuente, contenido, keywords, tema),
        )
        conn.commit()
        if cursor.rowcount > 0:
            logger.debug("Noticia insertada: %s", titulo[:60])
            return cursor.lastrowid
        else:
            logger.debug("Noticia duplicada (ignorada): %s", link[:80])
            return None
    except sqlite3.Error as e:
        logger.error("Error al insertar noticia: %s", e)
        return None
    finally:
        conn.close()


def obtener_noticia_por_link(link: str) -> Optional[dict]:
    """Busca una noticia por su URL."""
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM noticias WHERE link = ?", (link,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def obtener_noticias_recientes(limite: int = 50, dias: int = 7) -> list[dict]:
    """Retorna las noticias más recientes dentro de los últimos N días."""
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM noticias
            WHERE fecha >= ?
            ORDER BY fecha DESC
            LIMIT ?
            """,
            (fecha_limite, limite),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def obtener_noticias_sin_contenido(limite: int = 50) -> list[dict]:
    """Retorna noticias que aún no tienen contenido scrapeado."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM noticias
            WHERE contenido = '' OR contenido IS NULL
            ORDER BY fecha DESC
            LIMIT ?
            """,
            (limite,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def actualizar_contenido_noticia(
    noticia_id: int,
    contenido: str,
    keywords: str = "",
    tema: str = "",
) -> None:
    """Actualiza el cuerpo, keywords y tema de una noticia ya insertada."""
    conn = _get_connection()
    try:
        conn.execute(
            """
            UPDATE noticias
            SET contenido = ?, keywords = ?, tema = ?
            WHERE id = ?
            """,
            (contenido, keywords, tema, noticia_id),
        )
        conn.commit()
    except sqlite3.Error as e:
        logger.error("Error al actualizar noticia %d: %s", noticia_id, e)
    finally:
        conn.close()


# ─────────────────────────────────────────────
# OPERACIONES DE COMENTARIOS
# ─────────────────────────────────────────────

def insertar_comentario(
    noticia_id: int,
    texto: str,
    sentimiento: str = "NEU",
    score: float = 0.0,
    keywords: str = "",
    fecha: str = "",
) -> Optional[int]:
    """Inserta un comentario asociado a una noticia."""
    if not fecha:
        fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = _get_connection()
    try:
        cursor = conn.execute(
            """
            INSERT INTO comentarios
                (noticia_id, texto, sentimiento, score, keywords, fecha)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (noticia_id, texto, sentimiento, score, keywords, fecha),
        )
        conn.commit()
        return cursor.lastrowid
    except sqlite3.Error as e:
        logger.error("Error al insertar comentario: %s", e)
        return None
    finally:
        conn.close()


def comentario_existe(noticia_id: int, texto: str) -> bool:
    """Verifica si un comentario ya fue insertado (evitar duplicados)."""
    conn = _get_connection()
    try:
        row = conn.execute(
            """
            SELECT 1 FROM comentarios
            WHERE noticia_id = ? AND texto = ?
            LIMIT 1
            """,
            (noticia_id, texto),
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def obtener_comentarios_por_noticia(noticia_id: int) -> list[dict]:
    """Retorna todos los comentarios de una noticia."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM comentarios
            WHERE noticia_id = ?
            ORDER BY fecha DESC
            """,
            (noticia_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─────────────────────────────────────────────
# ESTADÍSTICAS PARA EL DASHBOARD
# ─────────────────────────────────────────────

def contar_noticias(dias: int = 7) -> int:
    """Total de noticias en los últimos N días."""
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as total FROM noticias WHERE fecha >= ?",
            (fecha_limite,),
        ).fetchone()
        return row["total"] if row else 0
    finally:
        conn.close()


def contar_comentarios_por_sentimiento(dias: int = 7) -> dict:
    """Cuenta comentarios agrupados por sentimiento en los últimos N días."""
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT sentimiento, COUNT(*) as total
            FROM comentarios
            WHERE fecha >= ?
            GROUP BY sentimiento
            """,
            (fecha_limite,),
        ).fetchall()
        resultado = {"POS": 0, "NEG": 0, "NEU": 0}
        for r in rows:
            if r["sentimiento"] in resultado:
                resultado[r["sentimiento"]] = r["total"]
        return resultado
    finally:
        conn.close()


def obtener_temas_frecuentes(dias: int = 7, limite: int = 10) -> list[dict]:
    """Retorna los temas más frecuentes en noticias recientes."""
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT tema, COUNT(*) as total
            FROM noticias
            WHERE fecha >= ? AND tema != ''
            GROUP BY tema
            ORDER BY total DESC
            LIMIT ?
            """,
            (fecha_limite, limite),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def obtener_indice_termometro(dias: int = 7) -> float:
    """
    Calcula el Índice de Termómetro Social:
    (Comentarios negativos / Total comentarios) * 100
    Retorna 0.0 si no hay comentarios.
    """
    sentimientos = contar_comentarios_por_sentimiento(dias)
    total = sum(sentimientos.values())
    if total == 0:
        return 0.0
    return round((sentimientos["NEG"] / total) * 100, 1)


def obtener_noticias_con_stats(limite: int = 30, dias: int = 7) -> list[dict]:
    """
    Retorna noticias recientes con la cantidad de comentarios
    y el sentimiento predominante de cada una.
    """
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                n.id, n.titulo, n.link, n.fecha, n.fuente,
                n.keywords, n.tema,
                COUNT(c.id) as total_comentarios,
                SUM(CASE WHEN c.sentimiento = 'POS' THEN 1 ELSE 0 END) as pos,
                SUM(CASE WHEN c.sentimiento = 'NEG' THEN 1 ELSE 0 END) as neg,
                SUM(CASE WHEN c.sentimiento = 'NEU' THEN 1 ELSE 0 END) as neu
            FROM noticias n
            LEFT JOIN comentarios c ON n.id = c.noticia_id
            WHERE n.fecha >= ?
            GROUP BY n.id
            ORDER BY n.fecha DESC
            LIMIT ?
            """,
            (fecha_limite, limite),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def obtener_timeline_sentimiento(dias: int = 7) -> list[dict]:
    """Retorna la evolución del sentimiento por día."""
    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT
                DATE(fecha) as dia,
                SUM(CASE WHEN sentimiento = 'POS' THEN 1 ELSE 0 END) as pos,
                SUM(CASE WHEN sentimiento = 'NEG' THEN 1 ELSE 0 END) as neg,
                SUM(CASE WHEN sentimiento = 'NEU' THEN 1 ELSE 0 END) as neu,
                COUNT(*) as total
            FROM comentarios
            WHERE fecha >= ?
            GROUP BY DATE(fecha)
            ORDER BY dia
            """,
            (fecha_limite,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─────────────────────────────────────────────
# INICIALIZACIÓN AL IMPORTAR
# ─────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print(f"✅ BD creada en: {DB_PATH}")

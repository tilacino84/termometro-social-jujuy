export function formatearFechaPublicacion(fechaStr?: string): string {
  if (!fechaStr) return 'Reciente';

  try {
    const d = new Date(fechaStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return fechaStr.slice(0, 16);

    const ahora = new Date();
    const diffMs = ahora.getTime() - d.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

    const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Si es del mismo día calendario
    if (d.toDateString() === ahora.toDateString()) {
      if (diffHoras < 1) return 'Hace instantes';
      if (diffHoras === 1) return 'Hace 1 hora';
      return `Hoy a las ${hora}`;
    }

    // Si fue ayer
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) {
      return `Ayer a las ${hora}`;
    }

    // Si fue hace más días: mostrar fecha exacta (ej: 26 Oct, 18:43 hs)
    const dia = d.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mes = meses[d.getMonth()];
    return `${dia} ${mes}, ${hora} hs`;
  } catch {
    return fechaStr.slice(0, 16);
  }
}

export function formatearMedio(fuente?: string): string {
  if (!fuente) return 'Medio Local';
  const f = String(fuente).toLowerCase();
  if (f.includes('somosjujuy')) return 'Somos Jujuy';
  if (f.includes('tribuno')) return 'El Tribuno de Jujuy';
  if (f.includes('almomento')) return 'Jujuy Al Momento';
  if (f.includes('google')) return 'Google Noticias';
  if (f.includes('cronica')) return 'Crónica Jujuy';
  if (f.includes('diario') || f.includes('pregon')) return 'Diario Pregón';
  if (f.includes('online')) return 'Jujuy OnLine Noticias';
  return fuente.replace(/_/g, ' ').toUpperCase();
}

export function formatearTimestampGeneral(isoStr?: string): string {
  if (!isoStr) return '--';
  try {
    const d = new Date(isoStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return isoStr;
    const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fecha = d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    return `${hora} hs · ${fecha}`;
  } catch {
    return isoStr;
  }
}

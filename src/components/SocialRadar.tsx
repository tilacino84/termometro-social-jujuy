import React, { useState } from 'react';
import { SocialFeedItem } from '../types';
import { EMOJI_MAP, crearEventoSocial } from '../utils/regionalAi';
import { formatearFechaPublicacion } from '../utils/dateFormatter';
import { PlusCircle, Sparkles, Send, MapPin, X } from 'lucide-react';

interface SocialRadarProps {
  feed: SocialFeedItem[];
  onAddPost?: (item: SocialFeedItem) => void;
}

export const SocialRadar: React.FC<SocialRadarProps> = ({ feed, onAddPost }) => {
  const [showSimulator, setShowSimulator] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialFeedItem['platform']>('instagram_reels');
  const [author, setAuthor] = useState('vecino_jujeño');
  const [locationTag, setLocationTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newPost = crearEventoSocial(inputText, selectedPlatform, author, locationTag);
    if (onAddPost) {
      onAddPost(newPost);
    }
    setInputText('');
    setShowSimulator(false);
  };

  const presetExamples = [
    { text: 'La frecuencia del colectivo Xibi Xibi en Alto Comedero es una vergüenza, esperamos una hora con frío', plat: 'instagram_reels' as const },
    { text: 'Qué churo el carnaval en Tilcara y Purmamarca, recibiendo a miles con nuestras tradiciones', plat: 'tiktok' as const },
    { text: 'Sin agua potable en barrio 18 de Noviembre en Palpalá. Exigimos respuesta urgente a la Muni', plat: 'facebook_groups' as const },
    { text: 'Comenzó la temporada en el Ingenio Ledesma y Calilegua, buena noticia para la economía regional', plat: 'x_twitter' as const },
    { text: 'Asamblea por el uso del agua en salar de Olaroz y Susques. Cuidemos la Puna jujeña', plat: 'facebook_groups' as const }
  ];

  const getPlatformBadge = (plat: string) => {
    switch (plat) {
      case 'instagram_reels':
        return { label: 'Instagram Reels', style: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
      case 'tiktok':
        return { label: 'TikTok', style: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'facebook_groups':
        return { label: 'Facebook Groups', style: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      default:
        return { label: 'X / Twitter', style: 'text-slate-300 bg-slate-500/10 border-slate-500/20' };
    }
  };

  return (
    <section id="social-radar-section" className="rounded-2xl bg-[#0c1222] border border-white/[0.08] p-6 lg:p-8 shadow-2xl relative overflow-hidden">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
            <span>Monitor de Redes Sociales</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>IA Regional Jujuy</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Comentarios en video y foros</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Pulso en Redes Sociales · Reels, TikToks y Grupos Públicos
          </h3>
        </div>

        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
        >
          {showSimulator ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Cerrar simulador</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5 text-pink-400" />
              <span>Probar analizador regional</span>
            </>
          )}
        </button>
      </div>

      {/* SIMULADOR DE INGESTA DE COMENTARIOS REGIONALES */}
      {showSimulator && (
        <form
          onSubmit={handleSubmit}
          className="p-5 bg-[#070b16] border border-pink-500/20 rounded-xl flex flex-col gap-3.5 my-6 animate-fade-in"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Simulador de Análisis de Sentimiento con Léxico Jujeño</span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="text-slate-400 self-center text-[0.72rem]">Cargar ejemplo:</span>
            {presetExamples.map((ex, i) => (
              <button
                type="button"
                key={i}
                onClick={() => {
                  setInputText(ex.text);
                  setSelectedPlatform(ex.plat);
                }}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-md text-slate-300 border border-white/5 transition-all text-left text-[0.72rem] cursor-pointer"
              >
                {ex.text.slice(0, 34)}...
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[0.72rem] text-slate-400 block mb-1 font-medium">
                Texto del comentario o testimonio en redes:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un comentario jujeño (ej: 'El aumento del boleto en San Salvador es un desastre...')"
                className="w-full px-3 py-2 bg-[#0c1222] border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 h-20 resize-none"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[0.72rem] text-slate-400 block mb-1 font-medium">Plataforma:</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-[#0c1222] border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-pink-500"
                >
                  <option value="instagram_reels">Instagram Reels</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook_groups">Facebook Groups</option>
                  <option value="x_twitter">X / Twitter</option>
                </select>
              </div>

              <div>
                <label className="text-[0.72rem] text-slate-400 block mb-1 font-medium">Usuario / Perfil:</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1 bg-[#0c1222] border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[0.72rem] text-slate-400 block mb-1 font-medium">Ubicación local (opcional):</label>
                <input
                  type="text"
                  value={locationTag}
                  onChange={(e) => setLocationTag(e.target.value)}
                  placeholder="Auto-detectada si se deja vacío"
                  className="w-full px-3 py-1 bg-[#0c1222] border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Evaluar y Publicar al Feed</span>
            </button>
          </div>
        </form>
      )}

      {/* FEED GRID */}
      <div className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="social-feed-grid">
        {feed.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs">
            No hay eventos de redes sociales registrados en este período.
          </div>
        ) : (
          feed.slice(0, 8).map((item) => {
            const em = item.emocion || 'Frustración';
            const emIcon = EMOJI_MAP[em] || '💬';
            const sev = item.severidad || 2;
            const formattedTime = formatearFechaPublicacion(item.timestamp);
            const badge = getPlatformBadge(item.platform);

            return (
              <article
                key={item.id}
                className="bg-[#070b16]/70 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 flex flex-col justify-between gap-3 transition-all"
              >
                <div className="flex justify-between items-center gap-2">
                  <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded border ${badge.style}`}>
                    {badge.label}
                  </span>
                  <span className="text-[0.68rem] text-slate-500 font-mono">
                    {formattedTime}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed italic my-1 font-normal line-clamp-4">
                  “{item.text}”
                </p>

                <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/[0.04] pt-2 mt-auto">
                  <span className="flex items-center gap-1 text-[0.72rem] text-slate-400 truncate max-w-[50%]">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{item.departamento || item.location_tag || 'Jujuy'}</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[0.7rem] px-2 py-0.5 rounded bg-white/5 border border-white/5 font-semibold text-slate-200">
                      {emIcon} {em}
                    </span>
                    <span
                      title={`Severidad ${sev}/5`}
                      className="text-[0.68rem] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded tabular-nums"
                    >
                      N{sev}
                    </span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

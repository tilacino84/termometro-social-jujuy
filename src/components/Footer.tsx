import React from 'react';
import { formatearTimestampGeneral } from '../utils/dateFormatter';

interface FooterProps {
  actualizado?: string;
}

export const Footer: React.FC<FooterProps> = ({ actualizado }) => {
  const formattedUpdate = formatearTimestampGeneral(actualizado);

  return (
    <footer className="system-footer border-t border-white/[0.07] py-6 px-8 bg-[#070a12]/70 mt-12">
      <div className="footer-inner max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
        <div className="footer-left flex items-center gap-2">
          <span className="footer-brand font-bold text-slate-200">Termómetro Social Jujuy</span>
          <span className="footer-dot opacity-40">·</span>
          <span>Análisis de Opinión Pública y Monitoreo Hiperlocal</span>
        </div>
        <div className="footer-right">
          <span>
            Último pulso: <strong className="text-slate-200 font-semibold">{formattedUpdate}</strong>
          </span>
        </div>
      </div>
    </footer>
  );
};

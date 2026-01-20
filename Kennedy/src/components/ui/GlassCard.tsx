import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string; // Permite pasar clases extra como padding, márgenes, etc.
  onClick?: () => void; // Para que las tarjetas sean clickeables si es necesario
}

export const GlassCard = ({ children, className = '', onClick }: GlassCardProps) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative 
        bg-slate-900/60        /* Fondo oscuro semi-transparente */
        backdrop-blur-xl       /* Desenfoque potente (efecto vidrio) */
        border border-slate-700/50 /* Borde sutil */
        rounded-3xl            /* Bordes muy redondeados (estilo moderno) */
        overflow-hidden        /* Para que nada se salga de los bordes */
        transition-all duration-300 /* Suaviza cualquier animación */
        ${className}           /* Aquí se inyectan las clases extra que pases */
      `}
    >
      {/* Capa de ruido o brillo opcional (decorativo) */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Contenido */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
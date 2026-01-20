import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    // Este div es el "Lienzo" principal de toda la aplicación
    <div className="min-h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Contenedor central para que no se estire demasiado en pantallas gigantes */}
      <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
};
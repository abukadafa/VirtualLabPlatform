import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-8 mt-auto border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
          © 2026 Virtual Laboratory
        </p>
        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1">
          Africa Centre of Excellence on Technology Enhanced Learning
        </p>
      </div>
    </footer>
  );
};

export default Footer;
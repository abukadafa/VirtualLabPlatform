import React from 'react';

interface LogoProps {
    type: 'acetel' | 'noun';
    variant?: 'full' | 'icon';
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({
    type,
    variant = 'full',
    className = ''
}) => {
    // Use relative paths for public folder assets
    const logoSrc = type === 'acetel'
        ? '/images/acetel-logo.svg' // SVG recreation
        : '/images/noun-logo.png'; // PNG from user

    const alt = type === 'acetel'
        ? 'ACETEL Logo'
        : 'NOUN Logo';

    return (
        <div className={`flex items-center justify-center overflow-hidden ${className}`}>
            <img
                src={logoSrc}
                alt={alt}
                className={`${variant === 'icon' ? 'h-10' : 'h-12'} object-contain w-auto`}
                onError={(e) => {
                    // Fallback to PNG if SVG fails
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src.endsWith('.svg')) {
                        target.src = target.src.replace('.svg', '.png');
                    } else {
                        // If PNG also fails, use a colored placeholder div
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                            parent.innerHTML = `<div class="font-bold text-white bg-${type === 'acetel' ? '[#008751]' : '[#1a2b48]'} px-2 py-1 rounded text-xs">${type.toUpperCase()}</div>`;
                        }
                    }
                }}
            />
        </div>
    );
};

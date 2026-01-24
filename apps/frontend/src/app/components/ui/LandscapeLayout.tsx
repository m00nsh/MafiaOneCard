import { useState, useEffect, ReactNode, useRef } from 'react';

interface LandscapeLayoutProps {
    children: ReactNode;
    className?: string; // Additional classes for the inner container
}

// Fixed game resolution - acting as the source of truth for 16:9 aspect ratio
const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

export default function LandscapeLayout({ children, className = '' }: LandscapeLayoutProps) {
    const [isPortrait, setIsPortrait] = useState(false);
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isCurrentPortrait = height > width;

            setIsPortrait(isCurrentPortrait);

            // Calculate logical viewport dimensions (after rotation if needed)
            const viewportWidth = isCurrentPortrait ? height : width;
            const viewportHeight = isCurrentPortrait ? width : height;

            // Calculate scale to fit BASE resolution into viewport while maintaining aspect ratio (contain)
            const scaleX = viewportWidth / BASE_WIDTH;
            const scaleY = viewportHeight / BASE_HEIGHT;
            const newScale = Math.min(scaleX, scaleY);

            setScale(newScale);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const containerStyle: React.CSSProperties = isPortrait ? {
        width: '100vh',
        height: '100vw',
        transform: 'rotate(90deg)',
        transformOrigin: 'top left',
        position: 'fixed',
        top: '0',
        left: '100%',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black', // Letterbox bars
    } : {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black', // Letterbox bars
        overflow: 'hidden',
    };

    return (
        <div style={containerStyle}>
            {/* Scaled Game Container */}
            <div
                style={{
                    width: `${BASE_WIDTH}px`,
                    height: `${BASE_HEIGHT}px`,
                    transform: `scale(${scale})`,
                    flexShrink: 0, // Prevent flex container from shrinking this element
                }}
                className={`relative bg-[#00572b] overflow-hidden shadow-2xl ${className}`}
            >
                {children}
            </div>
        </div>
    );
}

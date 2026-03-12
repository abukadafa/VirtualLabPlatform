/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                acetel: {
                    green: {
                        DEFAULT: '#008751',
                        light: '#00a562',
                        dark: '#006d40',
                        50: '#e6f7f0',
                        100: '#b3e6d1',
                        200: '#80d5b2',
                        300: '#4dc493',
                        400: '#1ab374',
                        500: '#008751',
                        600: '#006d40',
                        700: '#005330',
                        800: '#003920',
                        900: '#001f10',
                    },
                    navy: {
                        DEFAULT: '#1a2b48',
                        light: '#2d4163',
                        dark: '#0f1a2e',
                        50: '#e8ebf2',
                        100: '#c1c9dc',
                        200: '#9aa7c6',
                        300: '#7385b0',
                        400: '#4c639a',
                        500: '#1a2b48',
                        600: '#15233a',
                        700: '#101b2b',
                        800: '#0b131d',
                        900: '#060b0e',
                    },
                },
                // Keep existing for compatibility
                primary: '#1a2b48',
                secondary: '#008751',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                heading: ['Montserrat', 'sans-serif'],
            },
        },
    },
    plugins: [],
}

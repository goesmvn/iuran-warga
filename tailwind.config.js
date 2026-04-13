/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fef1f2',
                    100: '#fde0e3',
                    200: '#fcc5ca',
                    300: '#f99da6',
                    400: '#f46a78',
                    500: '#eb3e50', // Tridatu Red
                    600: '#d52439',
                    700: '#b4192b',
                    800: '#951827',
                    900: '#7c1825',
                    950: '#430810',
                },
                tridatu: {
                    black: '#1f2937', // Deep slate basically
                    white: '#ffffff',
                    red: '#eb3e50',
                    gold: '#cba052' // Classic balinese gold
                }
            },
            fontFamily: {
                sans: ['"Inter"', 'system-ui', 'sans-serif'],
                display: ['"Playfair Display"', 'serif'],
            },
            backgroundImage: {
                'endek-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2v-2h2v2h2v-2h2v2h2v-2h2v2h2v-2h2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h2v2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2h-2v-2h-2v2H20v-1.5z' fill='%236b7280' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
            }
        },
    },
    plugins: [],
}

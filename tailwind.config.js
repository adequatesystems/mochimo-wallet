const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: ['Montserrat', ...fontFamily.sans],
  			secondary: ['Poppins', ...fontFamily.sans],
  			montserrat: ['Montserrat', ...fontFamily.sans],
  			poppins: ['Poppins', ...fontFamily.sans],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-5px)' },
  			},
  			'pulse-ring': {
  				'0%': { transform: 'scale(0.95)', opacity: '1' },
  				'100%': { transform: 'scale(1.3)', opacity: '0' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float': 'float 3s ease-in-out infinite',
  			'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: '#15DC96',
  				dark: '#1D2A2E',
  				light: '#FFFFFF',
  			},
  			secondary: {
  				DEFAULT: '#10B078',
  				dark: '#172124',
  				light: '#DDDDDD',
  			},
  			brand: {
  				mint: '#15DC96',
  				forest: '#10B078',
  				charcoal: '#1D2A2E',
  				slate: '#172124',
  			},
  			success: {
  				DEFAULT: '#15DC96',
  				foreground: '#FFFFFF',
  				muted: '#15DC9620'
  			},
  			error: {
  				DEFAULT: '#FF4747',
  				foreground: '#FFFFFF',
  				muted: '#FF474720'
  			},
  			warning: {
  				DEFAULT: '#FFB547',
  				foreground: '#FFFFFF',
  				muted: '#FFB54720'
  			},
  			info: {
  				DEFAULT: '#47B0FF',
  				foreground: '#FFFFFF',
  				muted: '#47B0FF20'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} 
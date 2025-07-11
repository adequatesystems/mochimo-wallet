import { cn } from '@/lib/utils'

interface LogoProps {
    className?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    animated?: boolean
    color?: string
}

const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
}

export function Logo({ className, size = 'md', animated = false, color = 'currentColor' }: LogoProps) {
    return (
        <div className={cn('relative', className)}>
            <svg
                viewBox="0 0 135 135"
                className={cn(sizes[size], 'transition-colors duration-200')}
                fill={color}
            >
                <g transform="translate(0.000000,135.000000) scale(0.100000,-0.100000)">
                    <path d="M502 1300 c-175 -46 -334 -174 -410 -330 -54 -110 -72 -184 -72 -295
0 -178 62 -328 185 -450 81 -80 152 -125 257 -163 66 -24 87 -26 208 -26 119
0 143 3 207 26 218 78 371 244 428 463 20 77 19 234 0 310 -46 175 -175 335
-335 413 -47 23 -112 49 -145 57 -83 21 -232 19 -323 -5z m92 -107 c-14 -31
-32 -69 -40 -85 l-15 -28 -103 0 c-98 0 -106 -2 -135 -26 l-31 -26 0 -321 c0
-177 -4 -327 -8 -333 -4 -6 -24 -13 -44 -16 -36 -4 -38 -3 -67 52 -43 80 -61
160 -61 265 0 105 17 174 62 265 42 83 151 194 235 238 53 28 181 70 220 71 8
1 3 -20 -13 -56z m250 30 c127 -37 268 -149 333 -264 92 -162 98 -390 15 -544
-26 -47 -29 -50 -67 -50 l-40 0 -6 334 -5 334 -28 23 c-27 24 -31 24 -227 24
-109 0 -199 3 -199 7 0 4 15 42 32 86 l33 79 53 -7 c30 -4 77 -13 106 -22z
m-329 -546 l0 -319 -93 -1 -92 -2 0 316 c0 174 3 319 7 323 4 4 46 5 93 4 l85
-3 0 -318z m233 -2 l2 -320 -87 2 -88 1 -3 307 c-2 224 1 311 9 322 9 10 32
13 88 11 l76 -3 3 -320z m260 313 c9 -9 12 -94 12 -320 l0 -308 -105 0 -105 0
0 313 c0 173 3 317 7 320 12 12 178 8 191 -5z m41 -751 c-196 -181 -555 -181
-755 -2 l-49 44 425 0 425 0 -46 -42z"/>
                </g>
            </svg>
            {animated && (
                <div className="absolute inset-0 animate-pulse-ring">
                    <div className="absolute inset-0 rounded-full border-2 border-primary opacity-75" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary opacity-50 animate-delay-100" />
                </div>
            )}
        </div>
    )
} 
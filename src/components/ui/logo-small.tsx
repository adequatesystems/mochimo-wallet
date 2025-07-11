import { cn } from '@/lib/utils'
import mochimoLogo from '@/assets/logo.svg'

interface LogoSmallProps {
    className?: string
    size?: 'xs' | 'sm' | 'md'
}

const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10'
}

export function LogoSmall({ className, size = 'sm' }: LogoSmallProps) {
    return (
        <div className={cn('relative', className)}>
            <img
                src={mochimoLogo}
                alt="Mochimo Logo"
                className={cn(
                    sizes[size],
                    'object-contain'
                )}
            />
        </div>
    )
} 
/**
 * Generates a HSL color from a string (tag)
 */
export function generateColorFromTag(tag: string): string {
  // Use the first 6 characters of the tag to generate hue
  const hueSource = tag.slice(0, 6)
  const hue = parseInt(hueSource, 16) % 360

  // Use the next 6 characters for saturation
  const satSource = tag.slice(6, 12)
  const saturation = 65 + (parseInt(satSource, 16) % 20) // 65-85% saturation

  // Use the last 6 characters for lightness
  const lightSource = tag.slice(-6)
  const lightness = 45 + (parseInt(lightSource, 16) % 15) // 45-60% lightness

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * Generates initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
} 
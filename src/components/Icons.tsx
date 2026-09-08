import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { name: 'thread' | 'calendar' | 'pin' | 'chevron' | 'close' | 'download' }

export function Icon({ name, ...props }: Props) {
  const paths = {
    thread: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3V8.5A5.5 5.5 0 0 1 8.5 3h4a7.5 7.5 0 0 1 7.5 7.5Z" /><path d="M7 9h8M7 13h5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}

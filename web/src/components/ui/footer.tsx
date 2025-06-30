export function Footer() {
  return (
    <footer className="text-xs text-muted-foreground flex items-center gap-1 justify-center py-3">
      Powered by{' '}
      <a 
        href="https://verixence.com" 
        className="underline font-semibold hover:text-foreground transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        Verixence
      </a>
    </footer>
  );
} 
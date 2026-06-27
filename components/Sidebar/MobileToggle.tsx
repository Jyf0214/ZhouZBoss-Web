import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface MobileToggleProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function MobileToggle({ isOpen, onClick }: MobileToggleProps) {
  return (
    <Button
      variant="primary"
      autoLoading={false}
      onClick={onClick}
      aria-label={isOpen ? '关闭侧边栏' : '打开侧边栏'}
      aria-expanded={isOpen}
      aria-controls="primary-sidebar"
      className={`md:hidden ${isOpen ? 'hidden' : ''} fixed top-6 left-6 z-[9999] rounded-2xl p-3.5 shadow-2xl shadow-zinc-900/20 hover:scale-110 active:scale-95`}
    >
      {isOpen ? <X size={22} /> : <Menu size={22} />}
    </Button>
  );
}

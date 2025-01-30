import { Download } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { exportService } from '@/lib/export/exportService';

interface ExportButtonProps {
  content: string;
  className?: string;
  children?: React.ReactNode;
}

const handleExport = async (format: 'md' | 'pdf' | 'html', content: string) => {
  await exportService.export(content, format);
};

export function ExportButton({ content, className, children }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className} asChild={true}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('md', content)}>
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('html', content)}>
          Export as HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

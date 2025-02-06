import { Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportService } from '@/lib/export/exportService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface ExportButtonProps {
  content: string;
  className?: string;
  children?: React.ReactNode;
}

const handleExport = async (format: 'md' | 'pdf' | 'html', content: string) => {
  await exportService.export(content, format);
};

export function ExportButton({
  content,
  className,
  children,
}: ExportButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={50}>
        <DropdownMenu>
          <TooltipTrigger>
            <DropdownMenuTrigger className={className} asChild={true}>
              {children}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('md', content)}>
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('html', content)}>
              Export as HTML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent side="top" align="end">
          {'Export'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

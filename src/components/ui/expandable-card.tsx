'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExpandableCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function ExpandableCard({
  title,
  description,
  children,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  console.log(children);
  return (
    <Card className="h-full relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className='text-2xl'>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 pt-0' : 'max-h-0 opacity-0 p-0'
        }`}
      >
        {children}
      </CardContent>
    </Card>
  );
}

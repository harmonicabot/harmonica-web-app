import { cn } from "@/lib/clientUtils";
import { TabsContent } from "@radix-ui/react-tabs";

export function TabContent({
  value,
  children,
  className
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContent value={value} className={cn("mt-4", className)}>
      {children}
    </TabsContent>
  );
}

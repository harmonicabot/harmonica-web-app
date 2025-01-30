import { HRMarkdown } from "@/components/HRMarkdown";
import { Card, CardContent } from "@/components/ui/card";
import { CustomAIResponse } from "@/lib/types";
import { TrashIcon } from "lucide-react";

export function CustomResponseCard({ 
  response, 
  onRemove 
}: { 
  response: CustomAIResponse;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="mb-4 relative">
      <button
        className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
        onClick={() => response.id && onRemove(response.id)}
      >
        <TrashIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
      </button>
      <CardContent className="max-h-[80vh] overflow-auto pb-0">
        <HRMarkdown content={response.content} />
      </CardContent>
    </Card>
  );
}

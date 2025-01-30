import { HRMarkdown } from "@/components/HRMarkdown";
import { Card, CardContent } from "@/components/ui/card";
import { CustomAIResponse } from "@/lib/types";
import { Download, TrashIcon } from "lucide-react";
import { ExportButton } from "@/components/Export/ExportButton";

export function CustomResponseCard({ 
  response, 
  onRemove 
}: { 
  response: CustomAIResponse;
  onRemove: (id: string) => void;
}) {

  return (
    <Card className="mb-4 relative">
      <div className="absolute top-2 right-2 flex gap-2">
        <ExportButton 
          content={response.content}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <button>
            <Download className="h-5 w-5 text-gray-500 hover:text-blue-500" />  
          </button>
        </ExportButton>
        <button
          className="p-2 rounded-full hover:bg-gray-100"
          onClick={() => response.id && onRemove(response.id)}
        >
          <TrashIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
        </button>
      </div>
      <CardContent className="max-h-[80vh] overflow-auto pb-0">
        <HRMarkdown content={response.content} />
      </CardContent>
    </Card>
  );
}
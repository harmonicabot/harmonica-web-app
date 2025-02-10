import { CustomAIResponse, OpenAIMessage } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import * as db from "@/lib/db";

export function useCustomResponses(id: string) {
  const [responses, setResponses] = useState<CustomAIResponse[]>([]);

  useEffect(() => {
    db.getCustomResponsesBySessionOrWorkspaceId(id).then(setResponses);
  }, [id]);

  const addResponse = useCallback((message: OpenAIMessage) => {
    const customResponse = {
      session_id: id, // This can be a workspace_id as well
      content: message.content,
      position: responses.length || 0,
    };
    db.createCustomResponse(customResponse).then((res) => {
      if (res) {
        setResponses(prev => [...prev, { ...customResponse, id: res.id }]);
      }
    });
  }, [responses.length, id]);

  const removeResponse = useCallback((responseId: string) => {
    db.deleteCustomResponse(responseId);
    setResponses(prev => {
      const filtered = prev.filter(r => r.id !== responseId);
      return filtered.map((r, idx) => ({ ...r, position: idx }));
    });
  }, []);

  return { responses, addResponse, removeResponse };
}

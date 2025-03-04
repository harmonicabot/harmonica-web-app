import { CustomAIResponse, OpenAIMessage } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';
import * as db from '@/lib/db';

export function useCustomResponses(
  id: string,
  responseType: string = 'CUSTOM'
) {
  const [responses, setResponses] = useState<CustomAIResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    console.log(`Getting custom blocks for ressource ${id} - ${responseType}`);
    db.getCustomResponsesByResourceIdAndType(id, responseType)
      .then((response) => {
        console.log(`Got ${response.length} responses`);
        setResponses(response);
      })
      .catch((err) => {
        console.error('Error fetching responses:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, responseType]);

  const addResponse = useCallback(
    (message: OpenAIMessage) => {
      const customResponse = {
        session_id: id, // This can be a workspace_id as well
        content: message.content,
        position: responses.length || 0,
        response_type: responseType,
      };
      db.createCustomResponse(customResponse).then((res) => {
        if (res) {
          setResponses((prev) => [...prev, { ...customResponse, id: res.id }]);
        }
      });
    },
    [responses.length, id, responseType]
  );

  const removeResponse = useCallback((responseId: string) => {
    db.deleteCustomResponse(responseId);
    setResponses((prev) => {
      const filtered = prev.filter((r) => r.id !== responseId);
      return filtered.map((r, idx) => ({ ...r, position: idx }));
    });
  }, []);

  return { responses, addResponse, removeResponse, isLoading };
}

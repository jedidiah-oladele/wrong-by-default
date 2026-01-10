/**
 * Event handlers for OpenAI Realtime API events.
 */

import { TranscriptMessage } from "@/lib/mockTranscript";
import { reportTokenUsage } from "./tokenUsage";

interface EventHandlers {
  addMessage: (message: TranscriptMessage) => void;
  setState: React.Dispatch<React.SetStateAction<any>>;
  onMessage?: (message: TranscriptMessage) => void;
  onLimitExceeded: () => void;
  currentAssistantMessageIdRef: React.MutableRefObject<string | null>;
  pendingUserMessagesRef: React.MutableRefObject<Map<string, { itemId: string; timestamp: number }>>;
}

export function createEventHandlers(handlers: EventHandlers) {
  const {
    addMessage,
    setState,
    onMessage,
    onLimitExceeded,
    currentAssistantMessageIdRef,
    pendingUserMessagesRef,
  } = handlers;

  return function handleServerEvent(event: Record<string, unknown>) {
    // Track user items when they're created to maintain proper order
    if (event.type === "conversation.item.added") {
      const item = (event as { item?: { id?: string; role?: string } }).item;
      if (item?.role === "user" && item.id) {
        // Track this user item so we can insert the transcript in the right place later
        pendingUserMessagesRef.current.set(item.id, {
          itemId: item.id,
          timestamp: Date.now(),
        });
      }
    } else if (event.type === "conversation.item.input_audio_transcription.completed") {
      const transcriptEvent = event as { transcript?: string; item_id?: string };
      const transcript = transcriptEvent.transcript;
      const itemId = transcriptEvent.item_id;
      
      if (transcript && itemId) {
        // Check if we have a pending message for this item
        const pending = pendingUserMessagesRef.current.get(itemId);
        const messageTimestamp = pending?.timestamp || Date.now();
        
        // Insert the user message at the correct position
        setState((prev: any) => {
          // Find where to insert: before any assistant messages created after this user item
          let insertIndex = prev.messages.length;
          
          // Find the first assistant message that was created after this user item
          for (let i = 0; i < prev.messages.length; i++) {
            const msg = prev.messages[i];
            if (msg.role === "assistant") {
              // Extract timestamp from message ID (format: "assistant-{timestamp}")
              const msgTimestamp = parseInt(msg.id.split("-")[1] || "0");
              if (msgTimestamp > messageTimestamp) {
                insertIndex = i;
                break;
              }
            }
          }
          
          // Create the new message
          const newMessage: TranscriptMessage = {
            id: `user-${messageTimestamp}`,
            role: "user",
            content: transcript,
          };
          
          // Insert at the correct position
          const newMessages = [
            ...prev.messages.slice(0, insertIndex),
            newMessage,
            ...prev.messages.slice(insertIndex),
          ];
          
          // Remove from pending
          pendingUserMessagesRef.current.delete(itemId);
          
          return {
            ...prev,
            messages: newMessages,
          };
        });
        
        // Also call onMessage callback
        onMessage?.({
          id: `user-${messageTimestamp}`,
          role: "user",
          content: transcript,
        });
      }
    } else if (event.type === "response.output_audio_transcript.delta") {
      // Handle streaming transcript deltas - accumulate them in real-time
      const delta = (event as { delta?: string }).delta;
      if (delta) {
        // Create or update the current assistant message
        if (!currentAssistantMessageIdRef.current) {
          // Create a new assistant message
          const messageId = `assistant-${Date.now()}`;
          currentAssistantMessageIdRef.current = messageId;
          addMessage({
            id: messageId,
            role: "assistant",
            content: delta,
          });
        } else {
          // Update existing message by appending delta
          setState((prev: any) => {
            const currentMessage = prev.messages.find(
              (msg: TranscriptMessage) => msg.id === currentAssistantMessageIdRef.current
            );
            if (currentMessage) {
              return {
                ...prev,
                messages: prev.messages.map((msg: TranscriptMessage) =>
                  msg.id === currentAssistantMessageIdRef.current
                    ? { ...msg, content: msg.content + delta }
                    : msg
                ),
              };
            }
            return prev;
          });
        }
      }
    } else if (event.type === "response.output_audio_transcript.done") {
      // Final transcript - update the current message or create new one
      const transcript = (event as { transcript?: string }).transcript;
      if (transcript) {
        if (currentAssistantMessageIdRef.current) {
          // Update the existing streaming message with final transcript
          setState((prev: any) => ({
            ...prev,
            messages: prev.messages.map((msg: TranscriptMessage) =>
              msg.id === currentAssistantMessageIdRef.current
                ? { ...msg, content: transcript }
                : msg
            ),
          }));
          currentAssistantMessageIdRef.current = null;
        } else {
          // Create new message if no streaming message exists
          addMessage({
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: transcript,
          });
        }
      }
    } else if (event.type === "response.done") {
      // Response is complete, reset the current assistant message ID
      const response = event as { 
        response?: { 
          output?: Array<{ 
            type?: string; 
            role?: string;
            content?: Array<{ 
              type?: string; 
              transcript?: string;
              text?: string;
            }> 
          }>;
          usage?: {
            total_tokens?: number;
            input_tokens?: number;
            output_tokens?: number;
          };
        } 
      };
      
      if (currentAssistantMessageIdRef.current && response.response?.output) {
        for (const output of response.response.output) {
          if (output.type === "message" && output.role === "assistant" && output.content) {
            for (const content of output.content) {
              if (content.type === "output_audio" && content.transcript) {
                // Update the existing message with the final transcript (might be more complete)
                setState((prev: any) => ({
                  ...prev,
                  messages: prev.messages.map((msg: TranscriptMessage) =>
                    msg.id === currentAssistantMessageIdRef.current
                      ? { ...msg, content: content.transcript || msg.content }
                      : msg
                  ),
                }));
                break;
              }
            }
          }
        }
      }
      
      // Report token usage to backend at checkpoint (when AI finishes responding)
      if (response.response?.usage?.total_tokens) {
        reportTokenUsage(response.response.usage.total_tokens, onLimitExceeded);
      }
      
      currentAssistantMessageIdRef.current = null;
    } else if (event.type === "conversation.item.created") {
      const item = (event as { item?: { role?: string; content?: Array<{ text?: string }> } })
        .item;
      if (item?.role === "assistant" && item.content?.[0]?.text) {
        addMessage({
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: item.content[0].text,
        });
      }
    }
  };
}

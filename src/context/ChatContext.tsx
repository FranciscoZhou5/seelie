import { supabase } from "@/lib/supabase";
import { Dispatch, SetStateAction, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ChatAgent = "user" | "system" | "assistant";

export interface ChatMessage {
  role: ChatAgent;
  content: string;
}

interface Error {
  status: number;
  message: string;
}

interface IChatContextValues {
  handleSendMessage: (message: string, sender: string) => Promise<void>;
  messages: ChatMessage[];
  showHeroSection: boolean;
}

const ChatContext = createContext({} as IChatContextValues);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatResponse, setChatResponse] = useState("");

  const showHeroSection = useMemo(() => {
    return messages.length === 0;
  }, [messages]);

  const handleSendMessage = useCallback(
    async (message: string, sender: string) => {
      if (message.length === 0) {
        return;
      }

      setMessages((prev) => [...prev, { role: "user", content: message }]);

      const response = await fetch("/api/response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: message }],
          sender,
        }),
      });

      if (!response.ok) {
        const { status } = response;

        console.log(`[ERROR] - ${response.statusText}`);

        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        setMessages((prev) => {
          const newArr = [...prev];

          newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], content: prev[prev.length - 1].content + chunkValue };

          return newArr;
        });
      }
    },
    [messages]
  );

  return (
    <ChatContext.Provider
      value={{
        handleSendMessage,
        messages,
        showHeroSection,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}

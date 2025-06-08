"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/utils/trpc";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Roboto } from "next/font/google";
import ReactMarkdown from "react-markdown";
import removeMarkdown from "remove-markdown";
import {
  ThumbsUp,
  ThumbsDown,
  Clipboard,
  RefreshCw,
  SquarePen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from 'next/image';
import Link from 'next/link';

// Add Conversation type
function extractAndClean(text: string) {
  // Match the last line containing the title
  const match = text.match(/(.*:\s*)(.*)$/m);

  if (match) {
    const title = match[2].trim();

    // Remove the entire line containing the title
    const cleanedText = text.replace(match[0], "").trim();

    return { title, cleanedText };
  }

  return { title: null, cleanedText: text };
}
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // optional weights
  display: "swap", // optional: controls fallback font behavior
});
type Conversation = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
};

type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  user_id: string;
  conversation_id: string;
  created_at: string;
  is_pending?: boolean;
  isTyping?: boolean;
  contentType?: "text" | "image";
  gemini_response?: string;
};

// Add state for pausing Gemini response
type PauseState = "idle" | "active";
const LibraryLogo = () => (
  <svg
    width={"fit-content"}
    height={"100%"}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-fit opacity-70 translate-x-1"
    aria-hidden="true"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M6.75 4.5C5.50736 4.5 4.5 5.50736 4.5 6.75C4.5 7.99264 5.50736 9 6.75 9C7.99264 9 9 7.99264 9 6.75C9 5.50736 7.99264 4.5 6.75 4.5ZM2.5 6.75C2.5 4.40279 4.40279 2.5 6.75 2.5C9.09721 2.5 11 4.40279 11 6.75C11 9.09721 9.09721 11 6.75 11C4.40279 11 2.5 9.09721 2.5 6.75Z"
      fill="white"
    ></path>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M17.25 4.5C16.0074 4.5 15 5.50736 15 6.75C15 7.99264 16.0074 9 17.25 9C18.4926 9 19.5 7.99264 19.5 6.75C19.5 5.50736 18.4926 4.5 17.25 4.5ZM13 6.75C13 4.40279 14.9028 2.5 17.25 2.5C19.5972 2.5 21.5 4.40279 21.5 6.75C21.5 9.09721 19.5972 11 17.25 11C14.9028 11 13 9.09721 13 6.75Z"
      fill="white"
    ></path>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M6.75 15C5.50736 15 4.5 16.0074 4.5 17.25C4.5 18.4926 5.50736 19.5 6.75 19.5C7.99264 19.5 9 18.4926 9 17.25C9 16.0074 7.99264 15 6.75 15ZM2.5 17.25C2.5 14.9028 4.40279 13 6.75 13C9.09721 13 11 14.9028 11 17.25C11 19.5972 9.09721 21.5 6.75 21.5C4.40279 21.5 2.5 19.5972 2.5 17.25Z"
      fill="white"
    ></path>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M17.25 15C16.0074 15 15 16.0074 15 17.25C15 18.4926 16.0074 19.5 17.25 19.5C18.4926 19.5 19.5 18.4926 19.5 17.25C19.5 16.0074 18.4926 15 17.25 15ZM13 17.25C13 14.9028 14.9028 13 17.25 13C19.5972 13 21.5 14.9028 21.5 17.25C21.5 19.5972 19.5972 21.5 17.25 21.5C14.9028 21.5 13 19.5972 13 17.25Z"
      fill="white"
    ></path>
  </svg>
);
const GPTLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    shape-rendering="geometricPrecision"
    text-rendering="geometricPrecision"
    image-rendering="optimizeQuality"
    fill-rule="evenodd"
    clip-rule="evenodd"
    width={"fit-content"}
    height={"100%"}
    viewBox="0 0 512 509.639"
    className="w-fit opacity-70"
  >
    <path
      fill-rule="nonzero"
      fill="white"
      // stroke="currentColor"
      d="M412.037 221.764a90.834 90.834 0 004.648-28.67 90.79 90.79 0 00-12.443-45.87c-16.37-28.496-46.738-46.089-79.605-46.089-6.466 0-12.943.683-19.264 2.04a90.765 90.765 0 00-67.881-30.515h-.576c-.059.002-.149.002-.216.002-39.807 0-75.108 25.686-87.346 63.554-25.626 5.239-47.748 21.31-60.682 44.03a91.873 91.873 0 00-12.407 46.077 91.833 91.833 0 0023.694 61.553 90.802 90.802 0 00-4.649 28.67 90.804 90.804 0 0012.442 45.87c16.369 28.504 46.74 46.087 79.61 46.087a91.81 91.81 0 0019.253-2.04 90.783 90.783 0 0067.887 30.516h.576l.234-.001c39.829 0 75.119-25.686 87.357-63.588 25.626-5.242 47.748-21.312 60.682-44.033a91.718 91.718 0 0012.383-46.035 91.83 91.83 0 00-23.693-61.553l-.004-.005zM275.102 413.161h-.094a68.146 68.146 0 01-43.611-15.8 56.936 56.936 0 002.155-1.221l72.54-41.901a11.799 11.799 0 005.962-10.251V241.651l30.661 17.704c.326.163.55.479.596.84v84.693c-.042 37.653-30.554 68.198-68.21 68.273h.001zm-146.689-62.649a68.128 68.128 0 01-9.152-34.085c0-3.904.341-7.817 1.005-11.663.539.323 1.48.897 2.155 1.285l72.54 41.901a11.832 11.832 0 0011.918-.002l88.563-51.137v35.408a1.1 1.1 0 01-.438.94l-73.33 42.339a68.43 68.43 0 01-34.11 9.12 68.359 68.359 0 01-59.15-34.11l-.001.004zm-19.083-158.36a68.044 68.044 0 0135.538-29.934c0 .625-.036 1.731-.036 2.5v83.801l-.001.07a11.79 11.79 0 005.954 10.242l88.564 51.13-30.661 17.704a1.096 1.096 0 01-1.034.093l-73.337-42.375a68.36 68.36 0 01-34.095-59.143 68.412 68.412 0 019.112-34.085l-.004-.003zm251.907 58.621l-88.563-51.137 30.661-17.697a1.097 1.097 0 011.034-.094l73.337 42.339c21.109 12.195 34.132 34.746 34.132 59.132 0 28.604-17.849 54.199-44.686 64.078v-86.308c.004-.032.004-.065.004-.096 0-4.219-2.261-8.119-5.919-10.217zm30.518-45.93c-.539-.331-1.48-.898-2.155-1.286l-72.54-41.901a11.842 11.842 0 00-5.958-1.611c-2.092 0-4.15.558-5.957 1.611l-88.564 51.137v-35.408l-.001-.061a1.1 1.1 0 01.44-.88l73.33-42.303a68.301 68.301 0 0134.108-9.129c37.704 0 68.281 30.577 68.281 68.281a68.69 68.69 0 01-.984 11.545v.005zm-191.843 63.109l-30.668-17.704a1.09 1.09 0 01-.596-.84v-84.692c.016-37.685 30.593-68.236 68.281-68.236a68.332 68.332 0 0143.689 15.804 63.09 63.09 0 00-2.155 1.222l-72.54 41.9a11.794 11.794 0 00-5.961 10.248v.068l-.05 102.23zm16.655-35.91l39.445-22.782 39.444 22.767v45.55l-39.444 22.767-39.445-22.767v-45.535z"
    />
  </svg>
);
function TypingBubble({
  text,
  onDone,
  msgRef,
  isPaused,
  onPause,
}: {
  text: string;
  onDone?: () => void;
  msgRef: React.RefObject<HTMLDivElement | null>;
  isPaused: boolean;
  onPause: (text: string) => void;
}) {
  const [displayedCount, setDisplayedCount] = React.useState(0);

  // Reset animation if text changes
  React.useEffect(() => {
    setDisplayedCount(0);
  }, [text]);

  React.useEffect(() => {
    if (displayedCount < text.length && !isPaused) {
      const timeout = setTimeout(() => {
        setDisplayedCount(displayedCount + 1);
      }, 6);
      return () => clearTimeout(timeout);
    } else if (isPaused) {
      onPause(text.slice(0, displayedCount));
    } else if (displayedCount === text.length && onDone) {
      onDone();
    }
  }, [displayedCount, text, onDone, isPaused, onPause]);

  setTimeout(() => {
    msgRef.current?.scrollIntoView({ behavior: "smooth" });
  }, 100);
  return (
    <div
      className="message-bubble message-ai"
      style={{ whiteSpace: "pre-wrap" }}
    >
      {text.slice(0, displayedCount)}
    </div>
  );
}

function BouncingDots() {
  // Show a single blinking white circle (like ChatGPT)
  return (
    <div
      className="message-bubble message-ai"
      style={{
        width: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: 28,
        padding: "12px 16px",
      }}
    >
      <span className="gpt-circle-cursor" />
    </div>
  );
}

// Add proper type for image part
type ImagePart = {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
};

export default function Home() {
  const [input, setInput] = useState("");
  const [input2, setInput2] = useState("");
  const [mode, setMode] = useState<"text" | "image">("text");
  const sideBarref = useRef<HTMLDivElement>(null);
  const [pendingAIMessage, setPendingAIMessage] = useState<null | {
    type: "text" | "image";
    content?: string;
  }>(null);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [title, setTitle] = useState<string>("Image");
  const [showSidebar, setShowSidebar] = useState(false);
  const [imageViewMode, setImageViewMode] = useState(false);
  const [currimg, setCurrimg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const utils = trpc.useUtils();
  const { user } = useUser();
  const hasCreatedInitialConversation = useRef(false);
  const onTypingDoneCalled = useRef(false);
  const isHandlingSend = useRef(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingGeminiMessage] = useState<Message | null>(null);

  // Add conversation queries and mutations
  const { data: conversations = [], isLoading: isConversationsLoading } =
    trpc.listConversations.useQuery(
      { user_id: user?.sub || "" },
      { enabled: !!user?.sub }
    );

  const createConversation = trpc.createConversation.useMutation({
    onSuccess: (newConversation) => {
      setCurrentConversation(newConversation);
      setShowSidebar(false);
      utils.listConversations.invalidate();
    },
  });

  const { data: messagesData = [], isLoading: isMessagesLoading } =
    trpc.getMessages.useQuery(
      { conversation_id: currentConversation?.id || "" },
      { enabled: !!currentConversation?.id }
    );
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = trpc.addMessage.useMutation({
    onSuccess: () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
  });

  const geminiText = trpc.geminiText.useMutation();
  const geminiImage = trpc.geminiImage.useMutation();

  // Add state for AI message state machine
  const [aiState, setAiState] = useState<"idle" | "loading" | "typing">("idle");
  const [aiTypingText, setAiTypingText] = useState<string | null>(null);

  const updateGeminiResponse = trpc.updateGeminiResponse.useMutation();

  const [pendingGeminiUpdate, setPendingGeminiUpdate] = useState<{
    id: string;
    response: string;
    isPaused?: boolean;
    contentType?: "text" | "image" | null | undefined;
  } | null>(null);

  // Add state for bottom sheet/modal
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const fileInputPhotosRef = useRef<HTMLInputElement>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputFilesRef = useRef<HTMLInputElement>(null);

  // Add state for pausing Gemini response
  const [isPaused, setIsPaused] = useState<PauseState>("idle");

  // Create initial conversation if none exists (run only once per session)
  useEffect(() => {
    if (isConversationsLoading) return;
    const initializeConversation = async () => {
      if (!user?.sub) return;
      const hasNewChat = conversations.some(
        (conv) => conv.title.toLowerCase() === "new chat"
      );
      if (!hasNewChat) {
        hasCreatedInitialConversation.current = true;
        await createConversation.mutateAsync({ user_id: user.sub });
      }
    };
    initializeConversation();
  }, [user?.sub, isConversationsLoading, conversations, createConversation]);

  // Add a loading state for conversation creation
  const isCreatingConversation = createConversation.status === "pending";

  // Update conversation title mutation
  const updateConversationTitle = trpc.updateConversationTitle.useMutation({
    onSuccess: () => {
      utils.listConversations.invalidate();
    },
  });
  console.log(pendingGeminiMessage, pendingAIMessage);
  // Modify handleNewChat to check for existing "New Chat"
  const handleNewChat = useCallback(() => {
    if (!user?.sub || isCreatingConversation) return;

    // Check if there's already a "New Chat" conversation
    const hasNewChat = conversations.some((conv) => conv.title === "New Chat");
    if (!hasNewChat) {
      createConversation.mutate({ user_id: user.sub });
    } else {
      // If there's already a "New Chat", switch to it
      const newChat = conversations.find((conv) => conv.title === "New Chat");
      console.log(newChat, "{{}}}");
      if (newChat) {
        setCurrentConversation(newChat);
        setShowSidebar(false);
      }
    }
  }, [user?.sub, isCreatingConversation, createConversation, conversations]);
  // Add error handling for conversation creation
  useEffect(() => {
    if (createConversation.status === "error") {
      console.error("Failed to create conversation:", createConversation.error);
      // Optionally show an error message to the user
    }
  }, [createConversation.status, createConversation.error]);

  // Add handlers for conversation management
  const handleSwitchConversation = useCallback((conversation: Conversation) => {
    setCurrentConversation(conversation);
    setShowSidebar(false);
  }, []);

  // Sync backend messages to local state only when conversation changes and loading is done
  useEffect(() => {
    if (!isMessagesLoading) {
      console.log(messagesData, "messagesData");
      setMessages(messagesData);
    }
    // eslint-disable-next-line
  }, [currentConversation?.id, isMessagesLoading]);

  // Update handleSend to optimistically add user message to local state
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHandlingSend.current) return;
    isHandlingSend.current = true;
    if (!input.trim() || !user?.sub || !currentConversation?.id) {
      isHandlingSend.current = false;
      return;
    }

    // Add user message optimistically
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9), // temp id
      content: input,
      role: "user",
      user_id: user.sub,
      contentType: mode,
      conversation_id: currentConversation.id,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add user message to backend
    let dbUserMsg;
    try {
      dbUserMsg = await addMessage.mutateAsync({
        content: input,
        user_id: user.sub,
        conversation_id: currentConversation.id,
        contentType: mode,
      });
    } catch (error) {
      console.error('Failed to add message:', error);
    }
    setInput2(input);
    setInput("");
    setIsGeminiLoading(true);
    setAiState("idle");
    setAiTypingText(null);
    setPendingGeminiUpdate(null);
    setIsPaused("idle");

    try {
      if (mode === "text") {
        const res = await geminiText.mutateAsync({
          prompt: `
          Answer the following prompt: ${input}.

At the end of the response, add the title for this prompt as a plain text line starting with "title:" without any markdown or special formatting.

The title should be  3 words long and captures the main idea of the prompt.
attach title like this:

title: <title>

`,
        });
        console.log(res.text, "res.text");
        const { title: tit, cleanedText } = extractAndClean(res.text);
        setTitle(tit || "...");
        res.text = cleanedText;
        setIsGeminiLoading(false);
        setAiState("typing");
        if (res.text && (dbUserMsg?.id || userMsg.id)) {
          onTypingDoneCalled.current = false;
          // Add Gemini message with isTyping true
          const geminiMsg: Message = {
            id: Math.random().toString(36).substr(2, 9),
            content: res.text,
            role: "assistant",
            user_id: "gemini",
            conversation_id: currentConversation.id,
            created_at: new Date().toISOString(),
            isTyping: true,
            contentType: "text",
          };
          setMessages((prev) => [...prev, geminiMsg]);
          setPendingGeminiUpdate({
            id: dbUserMsg?.id || userMsg.id,
            response: res.text,
          });
        } else {
          setAiState("idle");
        }
      } else {
        const res = await geminiImage.mutateAsync({ prompt: input });
        setIsGeminiLoading(false);
        const imagePart = res.data?.parts?.find((p: ImagePart) =>
          p.inlineData?.mimeType?.startsWith("image/")
        );
        if (imagePart?.inlineData?.data) {
          const base64Data = imagePart.inlineData.data;
          const mimeType = imagePart.inlineData.mimeType || "image/jpeg";
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          const blob = new Blob(byteArrays, { type: mimeType });

          // Upload to Supabase Storage
          const fileExtension = mimeType.split("/")[1] || "jpg";
          const fileName = `images/${currentConversation.id}/${Date.now()}.${fileExtension}`;
          const { error: uploadError } = await supabase.storage
            .from("messages")
            .upload(fileName, blob);

          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            if (uploadError.message.includes("bucket not found")) {
              const errorMsg: Message = {
                id: Math.random().toString(36).substr(2, 9),
                content: "Error: Storage bucket 'messages' not found. Please create a storage bucket named 'messages' in your Supabase project.",
                role: "assistant",
                user_id: "gemini",
                conversation_id: currentConversation.id,
                created_at: new Date().toISOString(),
                isTyping: false,
                contentType: "text",
              };
              setMessages((prev) => [...prev, errorMsg]);
              return;
            }
            return;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from("messages")
            .getPublicUrl(fileName);

          // Add Gemini message with image URL
          const geminiMsg: Message = {
            id: Math.random().toString(36).substr(2, 9),
            content: publicUrl,
            role: "assistant",
            user_id: "gemini",
            conversation_id: currentConversation.id,
            created_at: new Date().toISOString(),
            isTyping: false,
            contentType: "image",
          };
          setMessages((prev) => [...prev, geminiMsg]);
          setPendingGeminiUpdate({
            id: dbUserMsg?.id || userMsg.id,
            response: publicUrl,
            contentType: "image",
          });
        } else {
          setAiTypingText(removeMarkdown("[Image could not be generated]"));
          setAiState("typing");
        }
      }
    } catch (error: unknown) {
      setIsGeminiLoading(false);
      const errorMessage = "Gemini API error: " + (error instanceof Error ? error.message : String(error));
      onTypingDoneCalled.current = false;
      // Add error message with isTyping true
      const errorMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        content: errorMessage,
        role: "assistant",
        user_id: "gemini",
        conversation_id: currentConversation.id,
        created_at: new Date().toISOString(),
        isTyping: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      if (dbUserMsg?.id || userMsg.id) {
        setPendingGeminiUpdate({
          id: dbUserMsg?.id || userMsg.id,
          response: errorMessage,
        });
      }
    }
    isHandlingSend.current = false;
  };

  // Define handleResponse first
  const handleResponse = useCallback(async () => {
    if (pendingGeminiUpdate) {
      await updateGeminiResponse.mutateAsync({
        message_id: pendingGeminiUpdate.id,
        gemini_response: pendingGeminiUpdate.response,
        contentType: mode,
      });
      if (currentConversation?.title === "New Chat") {
        const __ =
          mode == "text"
            ? title
            : removeMarkdown(input2).split(" ").slice(0, 3).join(" ");
        await updateConversationTitle.mutateAsync({
          conversation_id: currentConversation.id,
          title: __,
        });
      }
      setPendingGeminiUpdate(null);
    }
  }, [pendingGeminiUpdate, mode, currentConversation, title, input2, updateGeminiResponse, updateConversationTitle]);

  // Then use it in useEffect
  useEffect(() => {
    if (pendingGeminiUpdate?.isPaused || pendingGeminiUpdate?.contentType == "image") {
      handleResponse();
    }
  }, [pendingGeminiUpdate, handleResponse]);

  // When typing is done, add Gemini's message to local state and backend, but do NOT refetch
  const handleTypingComplete = async (msg: Message) => {
    if (onTypingDoneCalled.current) return;
    onTypingDoneCalled.current = true;
    setAiState("idle");
    setAiTypingText(null);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isTyping: false } : m))
    );
    await handleResponse();
  };
  const handleTypingPaused = async (msg: Message, text: string) => {
    msg.content = text;
    if (onTypingDoneCalled.current) return;
    onTypingDoneCalled.current = true;
    setAiState("idle");
    setAiTypingText(null);
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isTyping: false } : m))
    );
    setPendingGeminiUpdate((v) => {
      if (!v) return v; // If v is null, don't update anything
      return {
        ...v,
        response: msg.content,
        isPaused: true,
      };
    });
  };

  const isMutating =
    addMessage.status === "pending" ||
    geminiText.status === "pending" ||
    geminiImage.status === "pending" ||
    isGeminiLoading;

  useEffect(() => {
    if (
      pendingAIMessage &&
      pendingAIMessage.type === "image" &&
      pendingAIMessage.content &&
      currentConversation?.id
    ) {
      addMessage.mutate({
        content: pendingAIMessage.content,
        user_id: "gemini-image",
        conversation_id: currentConversation.id,
      });
      setPendingAIMessage(null);
    }
  }, [pendingAIMessage, addMessage, currentConversation?.id]);

  // Helper for user initials
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";

  // Debug: log conversations before rendering sidebar

  // Add a useEffect for scrolling
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTypingText]);

  // Reset showPendingActions when pendingGeminiMessage changes
  

  // When conversations load, set 'New Chat' as the default conversation if it exists
  useEffect(() => {
    if (conversations.length > 0 && !currentConversation) {
      const newChat = conversations.find(
        (conv) => conv.title.toLowerCase() === "new chat"
      );
      if (newChat) {
        setCurrentConversation(newChat);
      } else {
        setCurrentConversation(conversations[0]);
      }
    }
  }, [conversations, currentConversation]);

  // Add state for image mode:
  const [isImageMode, setIsImageMode] = useState(false);

  // Handler for file input change (reuse your existing upload logic)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    setShowUploadMenu(false);
  };

  // Fix unused uploadData
  const handleImageUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await geminiImage.mutateAsync({ prompt: file.name });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  // Fix useEffect with handleResponse
  useEffect(() => {
    if (currentConversation) {
      handleResponse();
    }
  }, [currentConversation, handleResponse]);

  return (
    <div className="chat-container">
      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="sidebar-overlay"
          onClick={() => setShowSidebar(false)}
        />
      )}
      {/* Sidebar */}
      <div
        ref={sideBarref}
        className={`sidebar${showSidebar ? " show" : ""} p-1`}
      >
        <div className="sidebar-search-row !border-none !p-0 m-2 mt-4 mb-3">
          <div className="sidebar-search !border-0 !border-b !border-none ">
            <span className="sidebar-search-icon">
              {/* Minimal thin magnifying glass SVG */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="#8e8ea0"
                  stroke-width="1.5"
                />
                <line
                  x1="13"
                  y1="13"
                  x2="17"
                  y2="17"
                  stroke="#8e8ea0"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sidebar-search-input"
            />
            {searchTerm && (
              <button
                className="sidebar-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="8" cy="8" r="8" fill="#23232b" />
                  <path
                    d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
                    stroke="#8e8ea0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
          <button
            className="newchat-btn translate-x-2"
            title="New Chat"
            onClick={handleNewChat}
            aria-label="New Chat"
          >
            {<SquarePen size={22} strokeWidth={1.5} />}
          </button>
        </div>
        <div
          className="w-full  items-center text-white font-semibold m-1 mb-3 h-9 grid grid-cols-[15%_auto] cursor-pointer"
          onClick={handleNewChat}
        >
          <GPTLogo />
          ChatGPT
        </div>
        <a
          className="w-full  items-center text-white font-semibold m-1 mb-3 h-7 grid grid-cols-[15%_auto] appearance-none outline-none border-none cursor-pointer"
          href="https://chatgpt.com/explore"
        >
          <LibraryLogo />
          Explore GPTs
        </a>

        <div className={`sidebar-section-label ${roboto.className}`}>Chats</div>
        <div className="sidebar-chats-list">
          {conversations
            .filter((conv) =>
              conv.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((conv) => (
              <div
                key={conv.id}
                className={`sidebar-chat-item${
                  currentConversation?.id === conv.id ? " active" : ""
                }`}
                onClick={() => handleSwitchConversation(conv)}
              >
                <span className="sidebar-chat-title">{conv.title}</span>
              </div>
            ))}
        </div>
        <div className="sidebar-profile-row">
          <div className="sidebar-avatar">{userInitials}</div>
          <div className="sidebar-username">{user?.name || user?.email}</div>
        </div>
      </div>
      {/* Main Chat Area */}
      <div
        className={`absolute w-full h-full bg-black/80 z-10 transition-all duration-300 items-center justify-center ${imageViewMode ? "flex": "hidden"}`}
        onClick={() => setImageViewMode((v) => !v)}
      >
        <div className="w-[80%] flex items-center justify-center h-full">
          <Image
            src={currimg}
            alt=""
            className="object-cover relative"
          />
        </div>
      </div>
      <div
        className={`main-content ${showSidebar ? "moveRight" : ""} ${
          roboto.className
        }`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          console.log(target);
          const ariaLabel = target.getAttribute("aria-label");
          if (ariaLabel !== "Menu") setShowSidebar(false);
          else {
            if (showSidebar) setShowSidebar(false);
          }
        }}
      >
        {/* Header */}
        <header className="header">
          <button
            className="header-icon"
            aria-label="Menu"
            onClick={() => setShowSidebar(true)}
          >
            ☰
          </button>
          <span className="header-title">
            {currentConversation?.title || "New Chat"}
          </span>
          {user ? (
            <Link 
              href="/api/auth/logout"
              className="!text-gray-600 hover:!text-gray-900"
            >
              Logout
            </Link>
          ) : (
            <Link 
              href="/api/auth/login"
              className="!text-gray-600 hover:!text-gray-900"
            >
              Login
            </Link>
          )}
        </header>
        {/* Welcome Prompt */}
        <div className="welcome">Welcome to gpt-mobile</div>
        {/* System Notice */}
        <div className="system-notice">
          <span>⚠️</span>
          <span>This is a demo chat interface using Gemini API.</span>
        </div>
        {/* Mode Selector */}
        {/* <div className="d-flex justify-content-center align-items-center py-2 bg-white border-bottom">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${
                mode === "text" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setMode("text")}
            >
              Text
            </button>
            <button
              type="button"
              className={`btn btn-sm ${
                mode === "image" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setMode("image")}
            >
              Image
            </button>
          </div>
        </div> */}
        {/* Chat Messages */}
        <div className="chat-messages">
          {isMessagesLoading ? (
            <div className="text-center text-muted">Loading...</div>
          ) : (
            <>
              {messages.map((msg: Message) => {
                const isUser = msg.user_id === user?.sub;
                const isOld = msg.gemini_response && msg.content;

                return (
                  <React.Fragment key={msg.id}>
                    {isOld ? (
                      <div className="message-row flex-col">
                        <div className="message-bubble message-user">
                          {msg.content}
                        </div>
                        <div className="message-bubble message-ai mr-auto">
                          {msg.contentType == "text" ? (
                            <ReactMarkdown>{msg.gemini_response || ''}</ReactMarkdown>
                          ) : (
                            <Image
                              width={500}
                              height={300}
                              src={msg.gemini_response || msg.content || ''}
                              alt={`AI response in ${mode} mode`}
                              className="w-full cursor-pointer"
                              onClick={() => {
                                if (msg.gemini_response) {
                                  setCurrimg(msg.gemini_response);
                                  setImageViewMode(true);
                                }
                              }}
                            />
                          )}

                          <div
                            className="message-actions"
                            style={{
                              opacity: 1,
                              transition: "opacity 0.3s ease-in-out",
                            }}
                          >
                            <button title="Like" aria-label="Like">
                              <ThumbsUp size={15} strokeWidth={1.5} />
                            </button>
                            <button title="Dislike" aria-label="Dislike">
                              <ThumbsDown size={15} strokeWidth={1.5} />
                            </button>
                            <button
                              title="Copy"
                              aria-label="Copy"
                              onClick={() =>
                                navigator.clipboard.writeText(msg.content)
                              }
                            >
                              <Clipboard size={15} strokeWidth={1.5} />
                            </button>
                            <button title="Regenerate" aria-label="Regenerate">
                              <RefreshCw size={15} strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`message-row ${
                          isUser
                            ? "justify-content-end"
                            : "justify-content-start"
                        } ${isOld ? "flex-col" : "flex-row"}`}
                      >
                        {!isUser &&
                        msg.isTyping &&
                        msg.contentType === "text" ? (
                          <TypingBubble
                            text={msg.content}
                            msgRef={messagesEndRef}
                            onDone={() => {
                              handleTypingComplete(msg);
                            }}
                            onPause={(text) => {
                              handleTypingPaused(msg, text);
                            }}
                            isPaused={isPaused === "active"}
                          />
                        ) : (
                          <div
                            className={`message-bubble ${
                              isUser ? " message-user " : "message-ai hhh"
                            }`}
                          >
                            {msg.user_id === "gemini" ? (
                              msg.contentType == "text" ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              ) : (
                                <Image
                                  width={500}
                                  height={300}
                                  src={msg.gemini_response || msg.content || ''}
                                  alt={`User message in ${mode} mode`}
                                  className="w-full cursor-pointer"
                                  onClick={() => {
                                    if (msg.gemini_response) {
                                      setCurrimg(msg.gemini_response);
                                      setImageViewMode(true);
                                    }
                                  }}
                                />
                              )
                            ) : (
                              msg.content
                            )}
                            {!isUser && !msg.isTyping && (
                              <div
                                className="message-actions"
                                style={{
                                  opacity: 1,
                                  transition: "opacity 0.3s ease-in-out",
                                }}
                              >
                                <button title="Like" aria-label="Like">
                                  <ThumbsUp size={15} strokeWidth={1.5} />
                                </button>
                                <button title="Dislike" aria-label="Dislike">
                                  <ThumbsDown size={15} strokeWidth={1.5} />
                                </button>
                                <button
                                  title="Copy"
                                  aria-label="Copy"
                                  onClick={() =>
                                    navigator.clipboard.writeText(msg.content)
                                  }
                                >
                                  <Clipboard size={15} strokeWidth={1.5} />
                                </button>
                                <button
                                  title="Regenerate"
                                  aria-label="Regenerate"
                                >
                                  <RefreshCw size={15} strokeWidth={1.5} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
              {isGeminiLoading && (
                <div
                  className="message-row justify-content-start"
                  key="gemini-loading"
                >
                  <BouncingDots />
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        {/* Input Bar */}
        <form className="input-bar" onSubmit={handleSend}>
          <button
            type="button"
            className="input-icon"
            aria-label="Attach"
            onClick={() => setShowUploadMenu(true)}
          >
            +
          </button>
          <input
            type="text"
            placeholder={
              user
                ? isImageMode
                  ? "Describe an image..."
                  : "Ask anything"
                : "Login to chat..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isMutating || !user}
            className="input-text"
          />
          <button
            type="button"
            className={`input-icon image-toggle-btn${
              isImageMode ? " active" : ""
            }`}
            aria-label="Toggle image mode"
            onClick={() => {
              if (!isImageMode) {
                setMode("image");
              } else {
                setMode("text");
              }
              setIsImageMode((v) => !v);
            }}
            tabIndex={0}
          >
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          {(isGeminiLoading || aiState === "typing") && mode == "text" ? (
            <button
              type="button"
              className="input-icon"
              aria-label="Stop generating"
              onClick={() => setIsPaused("active")}
              style={{
                background: "#fff",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="14" cy="14" r="14" fill="#fff" />
                <rect
                  x="9"
                  y="9"
                  width="10"
                  height="10"
                  rx="2"
                  fill="#232323"
                />
              </svg>
            </button>
          ) : (
            <button
              className="input-icon"
              type="submit"
              disabled={
                isGeminiLoading ||
                aiState === "loading" ||
                !input.trim() ||
                !user
              }
              aria-label="Send"
            >
              ➤
            </button>
          )}
        </form>
      </div>
      {showUploadMenu && (
        <div
          className="upload-menu-overlay"
          onClick={() => setShowUploadMenu(false)}
        >
          <div
            className="upload-menu-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="upload-menu-row">
              <button
                className="upload-menu-btn"
                onClick={(e) => {
                  e.preventDefault();
                  fileInputPhotosRef.current?.click();
                }}
              >
                <span className="upload-menu-icon">
                  {/* Photos SVG */}
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ECECF1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <circle cx="8.5" cy="12.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </span>
                <span>Photos</span>
              </button>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                ref={fileInputPhotosRef}
                onChange={handleFileChange}
              />
              <button
                className="upload-menu-btn"
                onClick={(e) => {
                  e.preventDefault();
                  fileInputCameraRef.current?.click();
                }}
              >
                <span className="upload-menu-icon">
                  {/* Camera SVG */}
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ECECF1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="7" width="18" height="12" rx="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </span>
                <span>Camera</span>
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                ref={fileInputCameraRef}
                onChange={handleFileChange}
              />
              <button
                className="upload-menu-btn"
                onClick={(e) => {
                  e.preventDefault();
                  fileInputFilesRef.current?.click();
                }}
              >
                <span className="upload-menu-icon">
                  {/* Files SVG */}
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ECECF1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M9 9h6v6H9z" />
                  </svg>
                </span>
                <span>Files</span>
              </button>
              <input
                type="file"
                style={{ display: "none" }}
                ref={fileInputFilesRef}
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

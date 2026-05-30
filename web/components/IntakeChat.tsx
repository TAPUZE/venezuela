"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Box,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { DisclaimerGate } from "@/components/DisclaimerGate";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function getSessionId(): string {
  const KEY = "amparo_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function IntakeChat() {
  const [accepted, setAccepted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, message: text }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "…" }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Lo siento, ocurrió un error. Intente de nuevo." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function start() {
    sessionId.current = getSessionId();
    setAccepted(true);
    // Sending the consent confirmation kicks off the first question.
    setSending(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, message: "sí" }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", text: data.reply ?? "…" }]);
    } catch {
      setMessages([{ role: "assistant", text: "No se pudo iniciar. Recargue la página." }]);
    } finally {
      setSending(false);
    }
  }

  if (!accepted) {
    return <DisclaimerGate onAccept={start} />;
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={3} tt="uppercase" fw={800}>
          Admisión / Intake
        </Title>

        <Paper
          ref={scrollRef}
          p="md"
          shadow="none"
          style={{ height: "60vh", overflowY: "auto", border: "1px solid var(--mantine-color-dark-4)" }}
        >
          <Stack gap="sm">
            {messages.map((m, i) => (
              <Group key={i} justify={m.role === "user" ? "flex-end" : "flex-start"}>
                <Paper
                  p="sm"
                  bg={m.role === "user" ? "dark.9" : "gray.1"}
                  c={m.role === "user" ? "white" : "dark.9"}
                  maw="80%"
                >
                  <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {m.text}
                  </Text>
                </Paper>
              </Group>
            ))}
            {sending && (
              <Group justify="flex-start">
                <Loader size="sm" />
              </Group>
            )}
          </Stack>
        </Paper>

        <Group align="flex-end" gap="xs">
          <Box style={{ flex: 1 }}>
            <Textarea
              placeholder="Escriba su respuesta…"
              autosize
              minRows={1}
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
          </Box>
          <ActionIcon size="lg" variant="filled" onClick={() => send(input)} disabled={sending}>
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Stack>
    </Container>
  );
}

"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnomalyFlag } from "@/lib/types";

const severityColor: Record<string, string> = {
  HIGH: "dark.9",
  MEDIUM: "dark.6",
  LOW: "dark.3",
};

interface Deadline {
  kind: string;
  due_date: string;
  grace_until?: string;
  description: string;
}

function prettyLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string): string {
  if (status === "flagged_for_review") return "dark.9";
  if (status === "ready_for_attorney") return "dark.6";
  if (status === "ready_to_file" || status === "approved") return "dark.4";
  if (status === "sent" || status === "completed") return "dark.2";
  return "dark.5";
}

export default function CaseDetailClient({
  caseId,
  formType,
  status: initialStatus,
  narrative: initialNarrative,
  structuredData,
  flags,
  deadlines,
}: {
  caseId: string;
  formType: string;
  status: string;
  narrative: string;
  structuredData: Record<string, unknown>;
  flags: AnomalyFlag[];
  deadlines: Deadline[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [narrative, setNarrative] = useState(initialNarrative);
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(structuredData).map(([k, v]) => [k, v == null ? "" : String(v)]),
    ),
  );

  const hasHigh = flags.some((f) => f.severity === "HIGH");
  const sent = status === "sent" || status === "completed";
  const approved = status === "ready_to_file" || status === "approved";

  async function generatePdf() {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/generate-pdf`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
      setMessage("PDF generated.");
    } catch (e) {
      setMessage(`Failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setGenerating(false);
    }
  }

  async function saveEdits() {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ structured_data: fields, narrative_summary: narrative }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditing(false);
      setMessage("Draft saved.");
      router.refresh();
    } catch (e) {
      setMessage(`Save failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    setMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setStatus("ready_to_file");
      setMessage("Approved — ready to file.");
      router.refresh();
    } catch (e) {
      setMessage(`Approve failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    setMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/send`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setStatus("sent");
      setMessage("Filed / sent.");
      router.refresh();
    } catch (e) {
      setMessage(`Send failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Stack p="lg" gap="lg">
      <Group justify="space-between">
        <Group>
          <Button component={Link} href="/dashboard" variant="default" radius={0} size="xs" tt="uppercase">
            ← Queue
          </Button>
          <Title order={3} tt="uppercase">
            Case {caseId.slice(0, 8)} — {formType}
          </Title>
          <Badge color={statusColor(status)} radius={0}>
            {status.replace(/_/g, " ")}
          </Badge>
        </Group>
        <Button radius={0} tt="uppercase" variant="default" onClick={generatePdf} loading={generating}>
          Preview {formType} PDF
        </Button>
      </Group>

      {/* Attorney action bar: edit · approve · send is all the attorney must do. */}
      <Card withBorder radius={0} bg="dark.0">
        <Group justify="space-between">
          <Text size="sm" fw={600} tt="uppercase">
            Attorney Review — Edit · Approve · Send
          </Text>
          <Group>
            {!sent && (
              <Button
                radius={0}
                size="xs"
                tt="uppercase"
                variant={editing ? "filled" : "default"}
                loading={busy === "save"}
                onClick={() => (editing ? saveEdits() : setEditing(true))}
              >
                {editing ? "Save Draft" : "Edit"}
              </Button>
            )}
            {editing && (
              <Button radius={0} size="xs" tt="uppercase" variant="subtle" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button
              radius={0}
              size="xs"
              tt="uppercase"
              variant="default"
              loading={busy === "approve"}
              disabled={editing || approved || sent}
              onClick={approve}
            >
              {approved ? "Approved ✓" : "Approve"}
            </Button>
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                radius={0}
                size="xs"
                tt="uppercase"
                loading={busy === "send"}
                disabled={editing || !approved || sent}
                onClick={send}
              >
                {sent ? "Sent ✓" : "Send"}
              </Button>
            </motion.div>
          </Group>
        </Group>
        {hasHigh && !sent && (
          <Text size="xs" c="dark.9" mt="xs" fw={600}>
            HIGH-severity contradiction flagged — resolve before approving.
          </Text>
        )}
      </Card>

      {message && (
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      )}

      <Grid>
        {/* LEFT: narrative + deadlines + Mistake Vault flags */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius={0} mb="md">
            <Title order={5} tt="uppercase" mb="sm">
              Narrative Summary
            </Title>
            {editing ? (
              <Textarea
                autosize
                minRows={6}
                value={narrative}
                onChange={(e) => setNarrative(e.currentTarget.value)}
              />
            ) : (
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {narrative || "No narrative captured yet."}
              </Text>
            )}
          </Card>

          {deadlines.length > 0 && (
            <Card withBorder radius={0} mb="md">
              <Title order={5} tt="uppercase" mb="sm">
                Deadlines
              </Title>
              <Stack gap="xs">
                {deadlines.map((d) => (
                  <div key={d.kind}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {prettyLabel(d.kind)}
                      </Text>
                      <Badge color="dark.7" radius={0}>
                        {d.due_date}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {d.description}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Card>
          )}

          <Title order={5} tt="uppercase" mb="sm">
            Mistake Vault — {flags.length} flag{flags.length === 1 ? "" : "s"}
          </Title>
          {flags.length === 0 ? (
            <Alert radius={0} color="dark.3">
              No contradictions detected. An attorney must still review before filing.
            </Alert>
          ) : (
            <Stack gap="sm">
              {flags.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card withBorder radius={0}>
                    <Group justify="space-between" mb="xs">
                      <Badge color={severityColor[f.severity]} radius={0}>
                        {f.type} · {f.severity}
                      </Badge>
                    </Group>
                    <Text size="sm" mb="xs">
                      {f.description}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Narrative: “{f.narrative_quote}”
                    </Text>
                    <Text size="xs" c="dimmed">
                      Document: “{f.document_quote}”
                    </Text>
                    <Text size="xs" mt="xs" fw={600}>
                      Suggested: {f.suggested_fix}
                    </Text>
                  </Card>
                </motion.div>
              ))}
            </Stack>
          )}
        </Grid.Col>

        {/* RIGHT: editable structured data (PDF field mapping) */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius={0}>
            <Title order={5} tt="uppercase" mb="sm">
              Structured Data ({formType} fields)
            </Title>
            <Stack gap="xs">
              {Object.entries(fields).map(([key, value]) => (
                <TextInput
                  key={key}
                  label={prettyLabel(key)}
                  value={value}
                  readOnly={!editing}
                  variant={editing ? "default" : "filled"}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.currentTarget.value }))}
                />
              ))}
              {Object.keys(fields).length === 0 && (
                <Text size="sm" c="dimmed">
                  No structured data captured yet.
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

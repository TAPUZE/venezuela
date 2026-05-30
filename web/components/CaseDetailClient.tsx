"use client";

import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { motion } from "framer-motion";
import Link from "next/link";
import type { AnomalyFlag } from "@/lib/types";

const severityColor: Record<string, string> = {
  HIGH: "dark.9",
  MEDIUM: "dark.6",
  LOW: "dark.3",
};

export default function CaseDetailClient({
  caseId,
  formType,
  narrative,
  structuredData,
  flags,
}: {
  caseId: string;
  formType: string;
  narrative: string;
  structuredData: Record<string, unknown>;
  flags: AnomalyFlag[];
}) {
  const [generating, setGenerating] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);

  async function generatePdf() {
    setGenerating(true);
    setPdfMessage(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/generate-pdf`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setPdfMessage("PDF generated.");
    } catch (e) {
      setPdfMessage(`Failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setGenerating(false);
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
        </Group>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button radius={0} tt="uppercase" onClick={generatePdf} loading={generating}>
            Generate {formType} PDF
          </Button>
        </motion.div>
      </Group>
      {pdfMessage && (
        <Text size="sm" c="dimmed">
          {pdfMessage}
        </Text>
      )}

      <Grid>
        {/* LEFT: narrative + Mistake Vault flags */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius={0} mb="md">
            <Title order={5} tt="uppercase" mb="sm">
              Narrative Summary
            </Title>
            <Text size="sm">{narrative || "No narrative captured yet."}</Text>
          </Card>

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

        {/* RIGHT: structured data preview (PDF field mapping) */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius={0}>
            <Title order={5} tt="uppercase" mb="sm">
              Structured Data ({formType} fields)
            </Title>
            <Code block>{JSON.stringify(structuredData, null, 2)}</Code>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

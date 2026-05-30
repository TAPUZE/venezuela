"use client";

import { useState } from "react";
import { Button, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import { DISCLAIMER, DISCLAIMER_CLARIFICATION } from "@/lib/constants";

/**
 * Non-bypassable UPL disclaimer gate (FL HB 915 verbatim) shown in EN + ES before intake.
 * Requires explicit affirmative consent. No attorney-client relationship until a licensed
 * attorney signs a formal agreement.
 */
export function DisclaimerGate({ onAccept }: { onAccept: (lang: "en" | "es") => void }) {
  const [lang, setLang] = useState<"en" | "es">("es");

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" shadow="none">
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <Title order={2} tt="uppercase" fw={800} style={{ letterSpacing: "-0.02em" }}>
              Amparo
            </Title>
            <Group gap={0}>
              <Button
                variant={lang === "es" ? "filled" : "default"}
                size="xs"
                onClick={() => setLang("es")}
              >
                ES
              </Button>
              <Button
                variant={lang === "en" ? "filled" : "default"}
                size="xs"
                onClick={() => setLang("en")}
              >
                EN
              </Button>
            </Group>
          </Group>

          <Paper p="md" bg="dark.9" c="white">
            <Text fw={700} size="sm" style={{ lineHeight: 1.6 }}>
              {DISCLAIMER[lang]}
            </Text>
          </Paper>

          <Text size="sm" c="dimmed">
            {DISCLAIMER_CLARIFICATION[lang]}
          </Text>

          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Button fullWidth size="md" onClick={() => onAccept(lang)}>
              {lang === "es" ? "Sí, entiendo y acepto" : "Yes, I understand and accept"}
            </Button>
          </motion.div>
        </Stack>
      </Paper>
    </Container>
  );
}

"use client";

import { useState } from "react";
import { Anchor, Center, Stack, Text } from "@mantine/core";
import { DisclaimerGate } from "@/components/DisclaimerGate";

export default function Home() {
  const [accepted, setAccepted] = useState(false);

  if (!accepted) {
    return <DisclaimerGate onAccept={() => setAccepted(true)} />;
  }

  return (
    <Center mih="60vh">
      <Stack align="center" gap="xs">
        <Text fw={700} tt="uppercase">
          Consent recorded
        </Text>
        <Text c="dimmed" size="sm">
          Intake continues via WhatsApp. Attorneys can sign in to the{" "}
          <Anchor href="/dashboard" fw={600}>
            case dashboard
          </Anchor>
          .
        </Text>
      </Stack>
    </Center>
  );
}

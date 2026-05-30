"use client";

import { AppShell, Badge, Group, NavLink, Table, Text, Title } from "@mantine/core";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface QueueRow {
  caseId: string;
  name: string;
  form: string;
  status: string;
  threat: "HIGH" | "MEDIUM" | "LOW";
  lastContact: string;
}

const threatColor: Record<QueueRow["threat"], string> = {
  HIGH: "dark.9",
  MEDIUM: "dark.5",
  LOW: "dark.2",
};

export default function DashboardClient({ rows, mockMode }: { rows: QueueRow[]; mockMode: boolean }) {
  const [active, setActive] = useState("queue");
  const router = useRouter();

  return (
    <AppShell navbar={{ width: 240, breakpoint: "sm" }} padding="lg">
      <AppShell.Navbar p="md">
        <Title order={4} tt="uppercase" mb="lg" fw={800}>
          Amparo
        </Title>
        <NavLink label="Case Queue" active={active === "queue"} onClick={() => setActive("queue")} />
        <NavLink label="Deadlines" active={active === "deadlines"} onClick={() => setActive("deadlines")} component={Link} href="/dashboard/deadlines" />
      </AppShell.Navbar>

      <AppShell.Main>
        {mockMode && (
          <Badge color="dark.4" radius={0} mb="md">
            MOCK MODE — sample data. Add API keys in .env.local to go live.
          </Badge>
        )}
        <Group justify="space-between" mb="md">
          <Title order={3} tt="uppercase">
            Case Queue
          </Title>
          <Text c="dimmed" size="sm">
            {rows.length} active
          </Text>
        </Group>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Form</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Threat</Table.Th>
              <Table.Th>Last Contact</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <motion.tr
                key={r.caseId}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/dashboard/cases/${r.caseId}`)}
              >
                <Table.Td fw={600}>{r.name}</Table.Td>
                <Table.Td>{r.form}</Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {r.status}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={threatColor[r.threat]} radius={0}>
                    {r.threat}
                  </Badge>
                </Table.Td>
                <Table.Td c="dimmed">{r.lastContact}</Table.Td>
              </motion.tr>
            ))}
          </Table.Tbody>
        </Table>
      </AppShell.Main>
    </AppShell>
  );
}

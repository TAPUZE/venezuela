import { Badge, Card, Group, Stack, Table, Text, Title, Button } from "@mantine/core";
import { listCases, listClients } from "@/lib/data";
import { computeDeadlines } from "@/lib/deadlines";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const [cases, clients] = await Promise.all([listCases(), listClients()]);
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const rows = cases
    .flatMap((cf) =>
      computeDeadlines({ lastEntryDate: cf.last_entry_date }).map((d) => ({
        caseId: cf.id,
        phone: clientById.get(cf.client_id)?.phone_number ?? "Unknown",
        kind: d.kind,
        due: d.due_date,
        description: d.description,
      })),
    )
    .sort((a, b) => a.due.localeCompare(b.due));

  return (
    <Stack p="lg" gap="lg">
      <Group justify="space-between">
        <Title order={3} tt="uppercase">
          Deadlines
        </Title>
        <Button component="a" href="/dashboard" variant="default" radius={0} size="xs" tt="uppercase">
          ← Queue
        </Button>
      </Group>

      {rows.length === 0 ? (
        <Card withBorder radius={0}>
          <Text c="dimmed">No computable deadlines yet (need last-entry dates).</Text>
        </Card>
      ) : (
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Due</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Detail</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={i}>
                <Table.Td fw={700} ff="monospace">
                  {r.due}
                </Table.Td>
                <Table.Td>
                  <Badge radius={0} color={r.kind === "one_year_filing" ? "dark.9" : "dark.5"}>
                    {r.kind}
                  </Badge>
                </Table.Td>
                <Table.Td>{r.phone}</Table.Td>
                <Table.Td c="dimmed" fz="xs">
                  {r.description}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}

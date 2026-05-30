"use client";

import { useState } from "react";
import { Button, Card, Center, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

  async function handleLogin() {
    setError(null);
    setLoading(true);
    if (mockMode) {
      router.push("/dashboard");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <Center mih="100vh">
      <Card withBorder radius={0} p="xl" w={380}>
        <Stack>
          <Title order={3} tt="uppercase" fw={800}>
            Amparo — Attorney Login
          </Title>
          {mockMode && (
            <Text size="xs" c="dimmed">
              Mock mode: Supabase not configured. Click Sign In to view the dashboard with
              sample data.
            </Text>
          )}
          <TextInput
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            radius={0}
            disabled={mockMode}
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            radius={0}
            disabled={mockMode}
          />
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button fullWidth radius={0} onClick={handleLogin} loading={loading} tt="uppercase">
              Sign In
            </Button>
          </motion.div>
        </Stack>
      </Card>
    </Center>
  );
}

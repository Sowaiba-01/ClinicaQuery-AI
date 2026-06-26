import AppShell from "./components/AppShell";
import ChatWindow from "./components/ChatWindow";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string }>;
}) {
  const params = await searchParams;
  return (
    <AppShell>
      <ChatWindow initialChatId={params.chat} />
    </AppShell>
  );
}

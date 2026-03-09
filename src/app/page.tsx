import { LogoutButton } from "@/components/auth/logout-button";
import { TypingTest } from "@/components/typing-test/typing-test";

export default function Home() {
  return (
    <main className="main-container">
      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>
      <TypingTest />
    </main>
  );
}

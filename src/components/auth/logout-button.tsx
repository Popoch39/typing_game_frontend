"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/auth");
            },
          },
        });
      }}
      className="text-[var(--sub-color)] hover:text-[var(--text-color)]"
    >
      Logout
    </Button>
  );
}

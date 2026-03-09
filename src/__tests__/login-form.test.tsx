import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

// Mock next/navigation
const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// Mock auth-client
const signInEmailMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmailMock(...args) },
}));

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password fields", () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderWithProviders();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders email and password labels", () => {
    renderWithProviders();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("shows validation error for invalid email on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("you@example.com"), "invalid");
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
    expect(signInEmailMock).not.toHaveBeenCalled();
  });

  it("shows validation error for short password on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "test@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "short");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });
    expect(signInEmailMock).not.toHaveBeenCalled();
  });

  it("calls signIn.email with correct data on valid submit", async () => {
    signInEmailMock.mockResolvedValue({ data: { user: {} } });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "test@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "12345678",
      });
    });
  });

  it("redirects to / on successful login", async () => {
    signInEmailMock.mockResolvedValue({ data: { user: {} } });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "test@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows server error on failed login", async () => {
    signInEmailMock.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "test@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not submit when fields are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(signInEmailMock).not.toHaveBeenCalled();
    });
  });
});

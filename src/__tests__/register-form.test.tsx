import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/auth/register-form";

// Mock next/navigation
const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

// Mock auth-client
const signUpEmailMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signUp: { email: (...args: unknown[]) => signUpEmailMock(...args) },
}));

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterForm />
    </QueryClientProvider>,
  );
}

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name, email, and password fields", () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderWithProviders();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("renders all labels", () => {
    renderWithProviders();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("shows validation error for short name on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "J");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "j@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/name must be at least 2 characters/i),
      ).toBeInTheDocument();
    });
    expect(signUpEmailMock).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "John");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "not-email",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
    expect(signUpEmailMock).not.toHaveBeenCalled();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "John");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "john@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i),
      ).toBeInTheDocument();
    });
    expect(signUpEmailMock).not.toHaveBeenCalled();
  });

  it("calls signUp.email with correct data on valid submit", async () => {
    signUpEmailMock.mockResolvedValue({ data: { user: {} } });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "John");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "john@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(signUpEmailMock).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "12345678",
        name: "John",
      });
    });
  });

  it("redirects to / on successful registration", async () => {
    signUpEmailMock.mockResolvedValue({ data: { user: {} } });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "John");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "john@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows server error on failed registration", async () => {
    signUpEmailMock.mockResolvedValue({
      error: { message: "Email already exists" },
    });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "John");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "john@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not submit when all fields are empty", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(signUpEmailMock).not.toHaveBeenCalled();
    });
  });

  it("shows default error message when server error has no message", async () => {
    signUpEmailMock.mockResolvedValue({
      error: { message: undefined },
    });
    const user = userEvent.setup();
    renderWithProviders();

    await user.type(screen.getByPlaceholderText("Your name"), "John");
    await user.type(
      screen.getByPlaceholderText("you@example.com"),
      "john@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "12345678");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Registration failed")).toBeInTheDocument();
    });
  });
});

import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { login } from "@/lib/staff/auth";

export const Route = createFileRoute("/staff-login")({
  component: StaffLoginPage,
});

function StaffLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(username, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate({ to: res.session.role === "ADMIN" ? "/admin" : "/delivery" });
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
            <Lock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground">Staff Login</h1>
            <p className="text-sm text-muted-foreground">Authorized staff only</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u">Username</Label>
            <Input
              id="u"
              autoCapitalize="none"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p">Password</Label>
            <PasswordInput
              id="p"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          First-time setup: sign in with <strong>admin</strong> / <strong>tripura@2026</strong>, then
          change the password from Admin → Staff.
        </p>
        <Link to="/" className="mt-4 block text-center text-xs text-muted-foreground underline">
          Back to website
        </Link>
      </div>
    </section>
  );
}

/**
 * Login cards for the two public entry points:
 *  - StaffPortalLogin  -> Contact Us page  -> /delivery (or /admin for admins)
 *  - AdminPortalLogin  -> About Us page    -> /admin
 *
 * Both use the shared session in `@/lib/staff/auth`, so role-based
 * navigation and session persistence behave the same everywhere.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { loginAdmin, loginStaff, logout, useSession } from "@/lib/staff/auth";

type Mode = "staff" | "admin";

function LoginForm({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);

  const idPrefix = mode;
  // Admin and staff sessions are independent: a signed-in admin visiting the
  // staff form still gets the staff login (and vice versa).
  const expectedRole = mode === "admin" ? "ADMIN" : "DELIVERY_BOY";
  const sameRole = session?.role === expectedRole;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res =
      mode === "admin"
        ? await loginAdmin(username, password)
        : await loginStaff(username, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSwitching(false);
    navigate({ to: res.session.role === "ADMIN" ? "/admin" : "/delivery" });
  }

  if (session && sameRole && !switching) {
    const target = session.role === "ADMIN" ? "/admin" : "/delivery";
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Signed in as <strong className="text-foreground">{session.name}</strong> (
          {session.role === "ADMIN" ? "Admin" : "Delivery Staff"}).
        </p>
        <Button
          onClick={() => navigate({ to: target })}
          className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
        >
          {session.role === "ADMIN" ? "Open Admin Panel" : "Open Delivery Portal"}
        </Button>
        <button
          type="button"
          onClick={() => setSwitching(true)}
          className="w-full text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Sign in with a different account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {session && !sameRole ? (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Currently signed in as {session.name} (
          {session.role === "ADMIN" ? "Admin" : "Delivery Staff"}). Signing in below switches to a{" "}
          {mode === "admin" ? "admin" : "staff"} session.
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-user`}>
          {mode === "admin" ? "Admin username" : "Staff ID / Username"}
        </Label>
        <Input
          id={`${idPrefix}-user`}
          autoCapitalize="none"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-pass`}>Password</Label>
        <PasswordInput
          id={`${idPrefix}-pass`}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy}
        className="w-full bg-gradient-to-r from-gold to-gold-deep text-primary-foreground hover:opacity-90"
      >
        {busy ? "Signing in…" : mode === "admin" ? "Sign in as Admin" : "Sign in"}
      </Button>
      {session && !sameRole ? (
        <button
          type="button"
          onClick={() => logout()}
          className="w-full text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Log out of the current session
        </button>
      ) : null}
    </form>
  );
}


/** Staff Portal Login — rendered on the Contact Us page. */
export function StaffPortalLogin() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
          <Truck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Staff Portal Login
          </h2>
          <p className="text-sm text-muted-foreground">
            Delivery team members only — sign in to view today's route.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <LoginForm mode="staff" />
      </div>
    </div>
  );
}

/** Discreet Admin Login — rendered at the bottom of the About Us page. */
export function AdminPortalLogin() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-sm px-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 underline underline-offset-4 transition-colors hover:text-foreground"
        >
          <Lock className="h-3 w-3" />
          Admin Login
        </button>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">Admin Login</h2>
              <p className="text-xs text-muted-foreground">Authorized administrators only</p>
            </div>
          </div>
          <div className="mt-5">
            <LoginForm mode="admin" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
}

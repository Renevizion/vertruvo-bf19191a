import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BusinessBranding {
  business_name: string;
  logo_url: string | null;
  workspace_id: string;
}

export default function PortalLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Password setup mode: user arrived via recovery link from promotion email
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);

  const portalRedirect = slug ? `/portal/${slug}` : "/portal";

  // Detect recovery token (from "Set up your account" email)
  useEffect(() => {
    const handleRecoveryToken = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const type = params.get("type");

      if (type === "recovery") {
        // Supabase will have already established a session from the token
        // Show the "set your password" UI
        setIsSettingPassword(true);
      }
    };

    handleRecoveryToken();
  }, []);

  // Listen for auth state changes (handles recovery token session)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsSettingPassword(true);
        }
        // After they set password, redirect
        if (event === "SIGNED_IN" && !isSettingPassword && session) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          const isCustomer = roles?.some((r) => r.role === "customer");
          if (isCustomer) {
            navigate(portalRedirect, { replace: true });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, portalRedirect, isSettingPassword]);

  // Check if already logged in (and not in setup mode)
  useEffect(() => {
    if (isSettingPassword) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const isCustomer = roles?.some((r) => r.role === "customer");
        if (isCustomer) {
          navigate(portalRedirect, { replace: true });
        }
      }
    });
  }, [navigate, portalRedirect, isSettingPassword]);

  // Fetch business branding from slug
  useEffect(() => {
    if (!slug) {
      setBrandingLoading(false);
      return;
    }

    const fetchBranding = async () => {
      const { data, error } = await supabase.rpc("get_public_booking_data", {
        _slug: slug,
      });

      if (error || !data) {
        setNotFound(true);
        setBrandingLoading(false);
        return;
      }

      const parsed = data as any;
      setBranding({
        business_name: parsed.settings?.business_name || parsed.workspace?.name || slug,
        logo_url: parsed.settings?.logo_url || null,
        workspace_id: parsed.workspace?.id,
      });
      setBrandingLoading(false);
    };

    fetchBranding();
  }, [slug]);

  // Handle setting password (after clicking setup link from email)
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please re-enter your password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordSet(true);
      toast({ title: "Password set!", description: "Your account is ready. Redirecting..." });
      setTimeout(() => navigate(portalRedirect, { replace: true }), 1500);
    } catch (error: any) {
      toast({ title: "Failed to set password", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${portalRedirect}`,
            data: { account_type: "customer", first_name: firstName, last_name: lastName },
          },
        });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Check your email to verify, then sign in.",
        });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        navigate(portalRedirect, { replace: true });
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "Sign up failed" : "Sign in failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}${portalRedirect}`,
          data: { account_type: "customer" },
        },
      });
      if (error) throw error;
      toast({
        title: "Login link sent",
        description: `Check ${email} for a one-click login link.`,
      });
    } catch (error: any) {
      toast({
        title: "Couldn't send login link",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-12">
            <p className="text-lg font-semibold text-foreground mb-2">Business not found</p>
            <p className="text-sm text-muted-foreground">
              The link you followed doesn't match any business on our platform.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = branding?.business_name || "Client Portal";

  // Password setup screen (from promotion email)
  if (isSettingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
        <Card className="w-full max-w-sm overflow-hidden">
          <div className="bg-primary px-6 py-5 flex items-center gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover bg-primary-foreground/10" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-primary-foreground text-lg font-bold">{displayName[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-primary-foreground font-semibold text-lg leading-tight">{displayName}</h1>
              <p className="text-primary-foreground/70 text-xs">Account Setup</p>
            </div>
          </div>

          <CardContent className="p-6">
            {passwordSet ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-foreground">You're all set!</h2>
                <p className="text-sm text-muted-foreground mt-1">Redirecting to your portal...</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Set your password</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a password to finish setting up your account.
                  </p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="new-password" className="text-xs">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Choose a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirm-password" className="text-xs">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Setting up..." : "Set password & continue"}
                    {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/30 via-background to-background p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        {/* Business branding header */}
        <div className="bg-primary px-6 py-5 flex items-center gap-3">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt=""
              className="h-10 w-10 rounded-lg object-cover bg-primary-foreground/10"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-bold">
                {displayName[0]}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-primary-foreground font-semibold text-lg leading-tight">
              {displayName}
            </h1>
            <p className="text-primary-foreground/70 text-xs">Client Portal</p>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp
                ? "Sign up to access your bookings and services."
                : "Sign in to manage your bookings."}
            </p>
          </div>

          <form onSubmit={handlePasswordAuth} className="space-y-3">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="first-name" className="text-xs">First name</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="last-name" className="text-xs">Last name</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="portal-email" className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="portal-email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="portal-password" className="text-xs">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="portal-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={loading || !email.trim()}
            onClick={handleMagicLink}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send me a login link instead
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

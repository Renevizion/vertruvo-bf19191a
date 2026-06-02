import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Mail, Lock, User, AlertCircle, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";

// Zod schemas for input validation
const emailSchema = z.string().email("Please enter a valid email address").max(255, "Email must be less than 255 characters");

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const nameSchema = z.string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens and apostrophes");

const businessNameSchema = z.string()
  .min(1, "Business name is required")
  .max(200, "Business name must be less than 200 characters");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const getRedirectPath = async (userId: string): Promise<string> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = data?.map(r => r.role) || [];
    if (roles.includes("customer")) return "/portal";
    return "/home";
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const path = await getRedirectPath(session.user.id);
        navigate(path, { replace: true });
      }
    });
  }, [navigate]);

  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const emailResult = emailSchema.safeParse(loginEmail);
    if (!emailResult.success) {
      errors.loginEmail = emailResult.error.issues[0].message;
    }
    
    if (!loginPassword || loginPassword.length < 1) {
      errors.loginPassword = "Password is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignupForm = (): boolean => {
    const errors: Record<string, string> = {};
    const firstNameResult = nameSchema.safeParse(firstName);
    if (!firstNameResult.success) {
      errors.firstName = firstNameResult.error.issues[0].message;
    }
    
    const lastNameResult = nameSchema.safeParse(lastName);
    if (!lastNameResult.success) {
      errors.lastName = lastNameResult.error.issues[0].message;
    }
    
    const businessNameResult = businessNameSchema.safeParse(businessName);
    if (!businessNameResult.success) {
      errors.businessName = businessNameResult.error.issues[0].message;
    }
    
    const emailResult = emailSchema.safeParse(signupEmail);
    if (!emailResult.success) {
      errors.signupEmail = emailResult.error.issues[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(signupPassword);
    if (!passwordResult.success) {
      errors.signupPassword = passwordResult.error.issues[0].message;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (error) throw error;

      // If "Remember me" is off, sign out when browser/tab closes
      if (!rememberMe) {
        const handleUnload = () => {
          navigator.sendBeacon && supabase.auth.signOut();
        };
        window.addEventListener("beforeunload", handleUnload);
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      
      const path = await getRedirectPath(signInData.user?.id || "");
      navigate(path, { replace: true });
    } catch (error: any) {
      // Report auth errors to admin for debugging remote user issues
      const errorDetails = {
        type: 'login_error',
        email: loginEmail.trim().toLowerCase(),
        errorMessage: error.message,
        errorCode: error.code || error.status,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      // Failed logins are normal user events, not system errors — don't log them
      
      toast({
        title: "Login failed",
        description: error.message === "Invalid login credentials" 
          ? "Invalid email or password" 
          : "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            business_name: businessName.trim(),
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "You can now log in with your credentials.",
      });
      
      // Auto-login after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
      });

      if (!loginError) {
        // Send welcome email (fire-and-forget)
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'welcome',
            recipientEmail: signupEmail.trim().toLowerCase(),
            idempotencyKey: `welcome-${signupEmail.trim().toLowerCase()}`,
            templateData: { name: firstName.trim() },
          },
        }).catch(() => {}); // Non-blocking

        const { data: { session } } = await supabase.auth.getSession();
        const path = await getRedirectPath(session?.user?.id || "");
        navigate(path, { replace: true });
      }
    } catch (error: any) {
      // Report signup errors to admin for debugging
      const errorDetails = {
        type: 'signup_error',
        email: signupEmail.trim().toLowerCase(),
        errorMessage: error.message,
        errorCode: error.code || error.status,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };
      
      // Failed signups are normal user events, not system errors — don't log them
      
      // Show actual error message from Supabase for better UX
      let message = error.message || "Could not create account";
      
      // Make common errors more readable
      if (error.message?.includes("already registered")) {
        message = "An account with this email already exists";
      } else if (error.message?.includes("weak") || error.message?.includes("easy to guess")) {
        message = "Password is too weak. Try a more unique password with mixed characters.";
      }
      
      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field: string) => {
    if (validationErrors[field]) {
      return (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          {validationErrors[field]}
        </p>
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>Sign In to Thermi | The Operating System for HVAC Businesses</title>
        <meta name="description" content="Log in or create your Thermi account. Voice agents, CRM, booking, payments and campaigns — one platform for HVAC businesses." />
        <meta name="keywords" content="Thermi login, Thermi signup, HVAC business OS, HVAC AI receptionist login" />
        <link rel="canonical" href="https://thermi.com/auth" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="w-full max-w-md mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Thermi
          </Button>
        </div>
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome to Thermi</CardTitle>
          <CardDescription className="text-center">
            Manage your business relationships efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 gap-2"
            disabled={loading}
            onClick={async () => {
              try {
                const { lovable } = await import("@/integrations/lovable");
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/home`,
                });
                if (result.error) throw result.error;
                if (result.redirected) return;
                window.location.href = "/home";
              } catch (e: any) {
                toast({ title: "Google sign-in failed", description: e.message || "Try again.", variant: "destructive" });
              }
            }}

          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
          </div>
          <Tabs defaultValue="login" className="w-full" onValueChange={() => setValidationErrors({})}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setValidationErrors(prev => ({ ...prev, loginEmail: "" }));
                      }}
                      className={`pl-10 ${validationErrors.loginEmail ? "border-destructive" : ""}`}
                      required
                      autoComplete="email"
                    />
                  </div>
                  {renderError("loginEmail")}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setValidationErrors(prev => ({ ...prev, loginPassword: "" }));
                      }}
                      className={`pl-10 ${validationErrors.loginPassword ? "border-destructive" : ""}`}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  {renderError("loginPassword")}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <ForgotPasswordDialog />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Log In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="first-name"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          setValidationErrors(prev => ({ ...prev, firstName: "" }));
                        }}
                        className={`pl-10 ${validationErrors.firstName ? "border-destructive" : ""}`}
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    {renderError("firstName")}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setValidationErrors(prev => ({ ...prev, lastName: "" }));
                      }}
                      className={validationErrors.lastName ? "border-destructive" : ""}
                      required
                      autoComplete="family-name"
                    />
                    {renderError("lastName")}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="business-name"
                      placeholder="Your Company Inc."
                      value={businessName}
                      onChange={(e) => {
                        setBusinessName(e.target.value);
                        setValidationErrors(prev => ({ ...prev, businessName: "" }));
                      }}
                      className={`pl-10 ${validationErrors.businessName ? "border-destructive" : ""}`}
                      required
                      autoComplete="organization"
                    />
                  </div>
                  {renderError("businessName")}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        setValidationErrors(prev => ({ ...prev, signupEmail: "" }));
                      }}
                      className={`pl-10 ${validationErrors.signupEmail ? "border-destructive" : ""}`}
                      required
                      autoComplete="email"
                    />
                  </div>
                  {renderError("signupEmail")}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => {
                        setSignupPassword(e.target.value);
                        setValidationErrors(prev => ({ ...prev, signupPassword: "" }));
                      }}
                      className={`pl-10 ${validationErrors.signupPassword ? "border-destructive" : ""}`}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  {renderError("signupPassword")}
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Auth;
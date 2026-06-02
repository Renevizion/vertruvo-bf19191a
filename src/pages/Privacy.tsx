import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Privacy Policy | Thermi AI CRM</title>
        <meta
          name="description"
          content="Thermi privacy policy. Learn how we collect, use, and protect your data when using our AI CRM platform."
        />
        <link rel="canonical" href="https://thermi.com/privacy" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <h1 className="text-2xl font-bold">Thermi</h1>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h2 className="text-4xl font-bold mb-8">Privacy Policy</h2>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <section>
              <h3 className="text-2xl font-semibold mb-4">Introduction</h3>
              <p className="text-muted-foreground">
                Thermi ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how
                we collect, use, disclose, and safeguard your information when you use our AI CRM platform.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Information We Collect</h3>
              <p className="text-muted-foreground mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Account information (name, email, business details)</li>
                <li>Customer data you input into the platform</li>
                <li>Usage data and analytics</li>
                <li>Communication preferences</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">How We Use Your Information</h3>
              <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Protect against fraudulent or illegal activity</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Data Security</h3>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Your Rights</h3>
              <p className="text-muted-foreground mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Data Deletion Request</h3>
              <p className="text-muted-foreground mb-4">
                You have the right to request deletion of your personal data. To request deletion of your data:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
                <li>
                  Email us at{" "}
                  <a href="mailto:privacy@thermi.com" className="text-primary hover:underline">
                    privacy@thermi.com
                  </a>{" "}
                  with the subject line "Data Deletion Request"
                </li>
                <li>Include your account email address and any relevant user identifiers</li>
                <li>We will process your request within 30 days and confirm deletion via email</li>
              </ol>
              <p className="text-muted-foreground">
                If you signed up using Facebook Login, you can also disconnect Thermi from your Facebook settings. Upon
                disconnection or deletion request, we will remove all data associated with your account from our
                systems.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Contact Us</h3>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                Thermi
                <br />
                Connecticut 06850
                <br />
                Email:{" "}
                <a href="mailto:privacy@thermi.com" className="text-primary hover:underline">
                  privacy@thermi.com
                </a>
              </p>
            </section>

            <section>
              <p className="text-sm text-muted-foreground italic">Last updated: January 2026</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default Privacy;

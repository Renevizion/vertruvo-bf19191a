import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Terms of Service | Thermi AI CRM</title>
        <meta
          name="description"
          content="Thermi terms of service. Read our terms and conditions for using the Thermi AI CRM platform."
        />
        <link rel="canonical" href="https://thermi.com/terms" />
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
          <h2 className="text-4xl font-bold mb-8">Terms of Service</h2>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <section>
              <h3 className="text-2xl font-semibold mb-4">Agreement to Terms</h3>
              <p className="text-muted-foreground">
                By accessing or using Thermi, you agree to be bound by these Terms of Service and all applicable laws
                and regulations. If you do not agree with any of these terms, you are prohibited from using this
                service.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Use License</h3>
              <p className="text-muted-foreground mb-4">
                Permission is granted to access and use Thermi for business and personal relationship management
                purposes, subject to the following restrictions:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You may not modify or copy the materials</li>
                <li>You may not use the materials for any commercial purpose without authorization</li>
                <li>You may not attempt to reverse engineer any software contained in Thermi</li>
                <li>You may not remove any copyright or proprietary notations</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">User Accounts</h3>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account and password. You agree to
                accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Service Availability</h3>
              <p className="text-muted-foreground">
                We strive to provide consistent service but do not guarantee that Thermi will be available at all times.
                We may experience hardware, software, or other problems or need to perform maintenance, resulting in
                interruptions, delays, or errors.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Data Ownership</h3>
              <p className="text-muted-foreground">
                You retain all rights to the data you input into Thermi. We do not claim ownership of your customer
                data, business information, or other content you create using our platform.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Limitation of Liability</h3>
              <p className="text-muted-foreground">
                In no event shall Thermi or its suppliers be liable for any damages arising out of the use or inability
                to use the service, even if Thermi has been notified of the possibility of such damages.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Termination</h3>
              <p className="text-muted-foreground">
                We may terminate or suspend your account and access to the service immediately, without prior notice,
                for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third
                parties, or for any other reason.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Governing Law</h3>
              <p className="text-muted-foreground">
                These terms shall be governed by and construed in accordance with the laws of Connecticut, United
                States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold mb-4">Contact Information</h3>
              <p className="text-muted-foreground">Questions about the Terms of Service should be sent to:</p>
              <p className="text-muted-foreground mt-2">
                Thermi
                <br />
                Connecticut 06850
                <br />
                Email:{" "}
                <a href="mailto:legal@thermi.com" className="text-primary hover:underline">
                  legal@thermi.com
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

export default Terms;

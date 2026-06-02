import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      <Helmet>
        <title>Contact Thermi | AI CRM Support & Sales</title>
        <meta name="description" content="Get in touch with Thermi. Contact our team for AI CRM support, sales inquiries, or partnership opportunities. Located in Connecticut." />
        <meta name="keywords" content="Thermi contact, AI CRM support, Thermi sales, customer service" />
        <link rel="canonical" href="https://thermi.com/contact" />
        <meta property="og:title" content="Contact Thermi | AI CRM Support" />
        <meta property="og:description" content="Reach out to Thermi for support, sales, or partnership inquiries." />
        <meta property="og:url" content="https://thermi.com/contact" />
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

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Get in Touch</h2>
              <p className="text-muted-foreground text-lg">
                Have questions about Thermi AI CRM? We'd love to hear from you.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <h3 className="text-2xl font-semibold mb-6">Send us a message</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Send Message</Button>
                </form>
              </Card>

              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-2">Email Us</h4>
                      <p className="text-muted-foreground">
                        <a href="mailto:hello@thermi.com" className="hover:text-primary">
                          hello@thermi.com
                        </a>
                      </p>
                      <p className="text-muted-foreground">
                        <a href="mailto:support@thermi.com" className="hover:text-primary">
                          support@thermi.com
                        </a>
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-2">Location</h4>
                      <p className="text-muted-foreground">
                        Thermi Headquarters<br />
                        Connecticut 06850<br />
                        United States
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted">
                  <h4 className="font-semibold mb-2">Office Hours</h4>
                  <p className="text-muted-foreground">
                    Monday - Friday: 9:00 AM - 6:00 PM EST<br />
                    Saturday - Sunday: Closed
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;

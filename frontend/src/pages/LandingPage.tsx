import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Users,
  Calendar,
  TreePine,
  Globe,
  Award,
  ArrowRight,
  CheckCircle,
  BookOpen,
  Handshake,
  Leaf,
  Clock,
  MapPin,
  Star,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  Play,
} from "lucide-react";
import * as authService from "@/services/auth.service";

// ============== MOCK DATA ==============

const impactStats = [
  { id: 1, value: 15420, label: "Active Volunteers", icon: Users, suffix: "+" },
  { id: 2, value: 2847, label: "Events Completed", icon: Calendar, suffix: "" },
  { id: 3, value: 125000, label: "Trees Planted", icon: TreePine, suffix: "+" },
  { id: 4, value: 48250, label: "Hours Donated", icon: Clock, suffix: "" },
];

const features = [
  {
    id: 1,
    icon: Calendar,
    title: "Discover Events",
    description:
      "Browse hundreds of volunteer opportunities near you. Filter by cause, date, and location to find the perfect match.",
  },
  {
    id: 2,
    icon: Users,
    title: "Join Communities",
    description:
      "Connect with like-minded volunteers. Share experiences, coordinate efforts, and build lasting friendships.",
  },
  {
    id: 3,
    icon: Award,
    title: "Track Your Impact",
    description:
      "See your contributions visualized. Earn badges, certificates, and recognition for your volunteer hours.",
  },
  {
    id: 4,
    icon: Globe,
    title: "Make a Difference",
    description:
      "From local cleanups to global initiatives, every action counts. Start small, dream big.",
  },
];

const categories = [
  {
    id: 1,
    title: "Environment",
    description: "Tree planting, beach cleanups, wildlife conservation",
    icon: Leaf,
    image:
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=300&fit=crop",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    events: 342,
  },
  {
    id: 2,
    title: "Education",
    description: "Digital literacy, tutoring, mentorship programs",
    icon: BookOpen,
    image:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    events: 218,
  },
  {
    id: 3,
    title: "Community",
    description: "Food drives, shelter support, elderly care",
    icon: Handshake,
    image:
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=300&fit=crop",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    events: 456,
  },
  {
    id: 4,
    title: "Health",
    description: "Blood donations, health camps, mental wellness",
    icon: Heart,
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    events: 189,
  },
];

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Environmental Volunteer",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    content:
      "VolunteerHub has completely changed how I engage with my community. I've planted over 200 trees and met incredible people along the way!",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Event Manager",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    content:
      "As an organizer, this platform makes it effortless to coordinate events and manage volunteers. The analytics dashboard is incredibly helpful.",
    rating: 5,
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Student Volunteer",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    content:
      "I started volunteering through this app during college. Now I have 500+ hours logged and amazing experiences to share with future employers.",
    rating: 5,
  },
];

const upcomingEvents = [
  {
    id: 1,
    title: "City Park Cleanup Drive",
    date: "Dec 28, 2025",
    location: "Central Park, New York",
    participants: 45,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop",
    category: "Environment",
  },
  {
    id: 2,
    title: "Digital Literacy Workshop",
    date: "Jan 5, 2026",
    location: "Community Center, Brooklyn",
    participants: 28,
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
    category: "Education",
  },
  {
    id: 3,
    title: "Food Bank Distribution",
    date: "Jan 12, 2026",
    location: "Hope Center, Queens",
    participants: 62,
    image:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=250&fit=crop",
    category: "Community",
  },
];

const faqs = [
  {
    id: "faq-1",
    question: "How do I sign up as a volunteer?",
    answer:
      "Simply click the 'Start Volunteering' button and create your free account. You can then browse events, join communities, and start making an impact right away. The whole process takes less than 2 minutes!",
  },
  {
    id: "faq-2",
    question: "Is there a cost to use VolunteerHub?",
    answer:
      "VolunteerHub is completely free for volunteers. We believe everyone should have the opportunity to give back to their community without any barriers. Event organizers may have premium features available.",
  },
  {
    id: "faq-3",
    question: "How are volunteer hours tracked?",
    answer:
      "Event managers verify your attendance and hours after each event. You can also log hours manually for independent volunteering. All hours are stored in your profile and can be exported for certificates or resumes.",
  },
  {
    id: "faq-4",
    question: "Can I organize my own volunteer events?",
    answer:
      "Absolutely! Once you create an account, you can apply to become an Event Manager. After verification, you'll have access to our full suite of event management tools including registration, communication, and analytics.",
  },
  {
    id: "faq-5",
    question: "What safety measures are in place?",
    answer:
      "All event organizers are verified before they can post events. We have a reporting system for any concerns, and our team actively monitors the platform. Volunteers can also rate and review events to help maintain quality.",
  },
];

const partners = [
  { name: "Red Cross", logo: "🏥" },
  { name: "WWF", logo: "🐼" },
  { name: "Habitat for Humanity", logo: "🏠" },
  { name: "UNICEF", logo: "🌍" },
  { name: "Feeding America", logo: "🍎" },
];

// ============== ANIMATED COUNTER HOOK ==============

function useAnimatedCounter(
  end: number,
  duration: number = 2000,
  startOnView: boolean = true
) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (startOnView && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

// ============== INTERSECTION OBSERVER HOOK ==============

function useInView(threshold: number = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { isInView, ref };
}

// ============== COMPONENTS ==============

function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1920&h=1080&fit=crop"
          alt="Volunteers working together"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Join 15,000+ Volunteers Today</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-up">
            Empower Your Community,{" "}
            <span className="text-primary">One Act at a Time</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl animate-slide-up animation-delay-100">
            Discover meaningful volunteer opportunities, connect with passionate
            changemakers, and track the real impact you're making in the world.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up animation-delay-200">
            <Button size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/register">
                Start Volunteering
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 py-6"
              asChild
            >
              <Link to="/events">
                <Play className="mr-2 w-5 h-5" />
                Explore Events
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-6 mt-12 justify-center lg:justify-start animate-fade-in animation-delay-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Verified Events</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Trusted by NGOs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Stats Cards */}
      <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-10 space-y-4">
        <Card className="bg-background/80 backdrop-blur-sm border-primary/20 animate-float">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <TreePine className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">125K+</p>
              <p className="text-xs text-muted-foreground">Trees Planted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-background/80 backdrop-blur-sm border-primary/20 animate-float animation-delay-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">15K+</p>
              <p className="text-xs text-muted-foreground">Active Volunteers</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {impactStats.map((stat) => {
            const { count, ref } = useAnimatedCounter(stat.value, 2500);
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                ref={ref}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-foreground">
                  {count.toLocaleString()}
                  {stat.suffix}
                </p>
                <p className="text-muted-foreground mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const { isInView, ref } = useInView(0.2);

  return (
    <section ref={ref} className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            <Target className="w-3 h-3 mr-1" />
            How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Journey to Making a Difference
          </h2>
          <p className="text-lg text-muted-foreground">
            From finding opportunities to tracking your impact, we make
            volunteering simple and rewarding.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                  isInView ? "animate-slide-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { isInView, ref } = useInView(0.2);

  return (
    <section ref={ref} className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            <Heart className="w-3 h-3 mr-1" />
            Causes We Support
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Find Your Passion, Make Your Mark
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose from a variety of causes that align with your values and
            interests.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.id}
                className={`group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 ${
                  isInView ? "animate-slide-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className={`absolute top-4 left-4 p-2 rounded-lg ${category.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{category.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      {category.events} Events
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSection() {
  const { isInView, ref } = useInView(0.2);

  return (
    <section ref={ref} className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <Badge variant="secondary" className="mb-4">
              <Calendar className="w-3 h-3 mr-1" />
              Upcoming Events
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Join an Event Near You
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              Don't miss out on these upcoming opportunities to make a difference.
            </p>
          </div>
          <Button variant="outline" className="mt-4 md:mt-0" asChild>
            <Link to="/events">
              View All Events
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents.map((event, index) => (
            <Card
              key={event.id}
              className={`group overflow-hidden hover:shadow-lg transition-all duration-300 ${
                isInView ? "animate-slide-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Badge className="absolute top-4 left-4">{event.category}</Badge>
              </div>
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{event.participants} volunteers joined</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="secondary">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { isInView, ref } = useInView(0.2);

  return (
    <section ref={ref} className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">
            <Star className="w-3 h-3 mr-1" />
            Testimonials
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stories from Our Community
          </h2>
          <p className="text-lg text-muted-foreground">
            Hear from volunteers and organizers who are making real change.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className={`${isInView ? "animate-slide-up" : "opacity-0"}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-muted-foreground mb-6 italic">
                  "{testimonial.content}"
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const { isInView, ref } = useInView(0.2);

  return (
    <section ref={ref} className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <TrendingUp className="w-3 h-3 mr-1" />
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about getting started.
            </p>
          </div>

          {/* Accordion */}
          <Accordion
            type="single"
            collapsible
            className={`space-y-4 ${isInView ? "animate-fade-in" : "opacity-0"}`}
          >
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border rounded-lg px-6 bg-card"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function PartnersSection() {
  return (
    <section className="py-16 border-y bg-muted/20">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Trusted by organizations making a global impact
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-2xl">{partner.logo}</span>
              <span className="font-medium">{partner.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-white/20 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full bg-white/20 translate-x-1/3 translate-y-1/3" />
          </div>

          <div className="relative z-10 text-center py-16 md:py-20 px-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Join thousands of volunteers who are already changing the world.
              Your journey starts with a single step.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-base px-8 py-6"
                asChild
              >
                <Link to="/register">
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-base px-8 py-6 text-primary-foreground hover:bg-white/10"
                asChild
              >
                <Link to="/about">Learn More About Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============== MAIN LANDING PAGE ==============

export default function LandingPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle OAuth redirect token
    const accessToken = searchParams.get("accessToken");
    if (accessToken) {
      authService.setAuthToken(accessToken);
      window.history.replaceState({}, document.title, "/");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CategoriesSection />
      <UpcomingEventsSection />
      <TestimonialsSection />
      <PartnersSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}
